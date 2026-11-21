import { randomUUID } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SqliteEnrollmentStore } from "@/lib/enrollment/sqlite-store";

let store: SqliteEnrollmentStore;
let simulateFailure: "deal" | "task" | null = null;

vi.mock("@/lib/api/instance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/instance")>("@/lib/api/instance");
  return { ...actual, getSharedStore: () => store };
});
vi.mock("@/lib/api/panel-crm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/panel-crm")>("@/lib/api/panel-crm");
  return {
    ...actual,
    createDeal: (...args: Parameters<typeof actual.createDeal>) =>
      simulateFailure === "deal" ? Promise.reject(new Error("test_deal_failure")) : actual.createDeal(...args),
    createTask: (...args: Parameters<typeof actual.createTask>) =>
      simulateFailure === "task" ? Promise.reject(new Error("test_task_failure")) : actual.createTask(...args),
  };
});

import {
  adminKeyFingerprint, createPanelSessionToken, derivePanelSecret, PANEL_COOKIE_NAME,
} from "@/lib/api/panel-auth";
import { POST } from "./route";

const ALPHA = "intake-alpha-key-0123456789abcdef";
const BRAVO = "intake-bravo-key-0123456789abcdef";
const keys = { [ALPHA]: "alpha", [BRAVO]: "bravo" };
const secret = "intake-session-secret-0123456789abcdef";

type RequestOptions = {
  memberId?: string;
  origin?: string;
  idempotencyKey?: string | null;
  contentType?: string;
};

function request(tenant: "alpha" | "bravo", input: unknown, options: RequestOptions = {}) {
  const key = tenant === "alpha" ? ALPHA : BRAVO;
  const token = createPanelSessionToken(
    tenant, derivePanelSecret(keys, secret)!, Date.now(), 3600_000,
    adminKeyFingerprint(key), options.memberId,
  );
  const headers = new Headers({
    cookie: `${PANEL_COOKIE_NAME}=${token}`,
    origin: options.origin ?? "http://localhost:3000",
    "content-type": options.contentType ?? "application/json",
  });
  if (options.idempotencyKey !== null) {
    headers.set("idempotency-key", options.idempotencyKey ?? randomUUID());
  }
  return new Request("http://localhost:3000/api/panel/intake", {
    method: "POST", headers, body: JSON.stringify(input),
  });
}

describe("CRM atomic intake (SQLite)", () => {
  const old = {
    admin: process.env.QEYDAI_ADMIN_KEYS,
    secret: process.env.QEYDAI_PANEL_SECRET,
    database: process.env.QEYDAI_DATABASE_URL,
  };
  beforeEach(async () => {
    simulateFailure = null;
    delete process.env.QEYDAI_DATABASE_URL;
    process.env.QEYDAI_ADMIN_KEYS = JSON.stringify(keys);
    process.env.QEYDAI_PANEL_SECRET = secret;
    store = new SqliteEnrollmentStore(":memory:");
    store.initializeSalesWorkspace("alpha");
    store.initializeSalesWorkspace("bravo");
    await store.createSalesMember("alpha", "operator1", "Operator", "operator");
    await store.createSalesMember("alpha", "manager1", "Manager", "manager");
  });
  afterEach(() => {
    simulateFailure = null;
    store.close();
    if (old.admin === undefined) delete process.env.QEYDAI_ADMIN_KEYS;
    else process.env.QEYDAI_ADMIN_KEYS = old.admin;
    if (old.secret === undefined) delete process.env.QEYDAI_PANEL_SECRET;
    else process.env.QEYDAI_PANEL_SECRET = old.secret;
    if (old.database === undefined) delete process.env.QEYDAI_DATABASE_URL;
    else process.env.QEYDAI_DATABASE_URL = old.database;
  });

  const input = {
    name: "Aysel", phone: "050 123 45 67",
    title: "Saç kəsimi", message: "Sabah boş yer var?", source: "manual",
  };

  it("creates contact, deal and scheduled task for one tenant", async () => {
    const before = Date.now();
    const result = await POST(request("alpha", input));
    expect(result.status).toBe(201);
    const json = await result.json();
    expect(json.replayed).toBe(false);
    expect(json.contact.phone).toBe("+994501234567");
    expect(json.deal.contactId).toBe(json.contact.id);
    expect(json.task.dealId).toBe(json.deal.id);
    expect(new Date(json.task.dueAt).getTime()).toBeGreaterThanOrEqual(before + 23 * 3_600_000);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesDeals("alpha")).toHaveLength(1);
    expect(await store.listSalesTasks("alpha")).toHaveLength(1);
    expect(await store.listSalesContacts("bravo")).toHaveLength(0);
  });

  it("reuses an existing customer for separate requests without merging deals", async () => {
    expect((await POST(request("alpha", input))).status).toBe(201);
    expect((await POST(request("alpha", { ...input, title: "Rəngləmə" }))).status).toBe(201);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesDeals("alpha")).toHaveLength(2);
  });

  it("replays identical requests, and rejects an idempotency key reused with different content", async () => {
    const idem = randomUUID();
    const first = await (await POST(request("alpha", input, { idempotencyKey: idem }))).json();
    const replayResponse = await POST(request("alpha", input, { idempotencyKey: idem }));
    expect(replayResponse.status).toBe(200);
    const replay = await replayResponse.json();
    expect(replay.replayed).toBe(true);
    expect(replay.deal.id).toBe(first.deal.id);
    expect(replay.task.id).toBe(first.task.id);
    expect((await POST(request("alpha", { ...input, message: "other" }, { idempotencyKey: idem }))).status).toBe(409);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesDeals("alpha")).toHaveLength(1);
  });

  it("serializes same-phone and same-idempotency-key concurrent requests", async () => {
    const idem = randomUUID();
    const responses = await Promise.all([
      POST(request("alpha", input, { idempotencyKey: idem })),
      POST(request("alpha", input, { idempotencyKey: idem })),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 201]);
    const more = await Promise.all([
      POST(request("alpha", { ...input, title: "Dırnaq xidməti" })),
      POST(request("alpha", { ...input, title: "Rəngləmə" })),
    ]);
    expect(more.map((r) => r.status)).toEqual([201, 201]);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesDeals("alpha")).toHaveLength(3);
  });

  it.each(["deal", "task"] as const)("rolls back the contact when %s creation fails", async (at) => {
    simulateFailure = at;
    expect((await POST(request("alpha", input))).status).toBe(500);
    expect(await store.listSalesContacts("alpha")).toHaveLength(0);
    expect(await store.listSalesDeals("alpha")).toHaveLength(0);
    expect(await store.listSalesTasks("alpha")).toHaveLength(0);
    simulateFailure = null;
    expect((await POST(request("alpha", input))).status).toBe(201);
  });

  it("enforces session, permission and origin constraints", async () => {
    expect((await POST(new Request("http://localhost:3000/api/panel/intake", { method: "POST" }))).status).toBe(401);
    expect((await POST(request("alpha", input, { memberId: "operator1" }))).status).toBe(403);
    expect((await POST(request("alpha", input, { memberId: "unknown" }))).status).toBe(403);
    expect((await POST(request("alpha", input, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(request("alpha", input, { memberId: "manager1" }))).status).toBe(201);
  });

  it("rejects bad input, unsupported media, and missing idempotency key", async () => {
    expect((await POST(request("alpha", input, { idempotencyKey: null }))).status).toBe(422);
    expect((await POST(request("alpha", input, { contentType: "text/plain" }))).status).toBe(415);
    expect((await POST(request("alpha", { ...input, message: "" }))).status).toBe(422);
    expect((await POST(request("alpha", { ...input, name: "x".repeat(121) }))).status).toBe(422);
    expect((await POST(request("alpha", { ...input, phone: "123" }))).status).toBe(422);
    expect((await POST(request("alpha", { ...input, dueAt: "tomorrow" }))).status).toBe(422);
    expect((await POST(request("alpha", { ...input, dueAt: "2020-01-01T00:00:00Z" }))).status).toBe(422);
    expect((await POST(request("alpha", { ...input, source: "telegram" }))).status).toBe(422);
    expect(await store.listSalesContacts("alpha")).toHaveLength(0);
  });

  it("keeps the same phone separate across tenants and ids", async () => {
    const idem = randomUUID();
    const a = await (await POST(request("alpha", input, { idempotencyKey: idem }))).json();
    const b = await (await POST(request("bravo", input, { idempotencyKey: idem }))).json();
    expect(a.contact.id).not.toBe(b.contact.id);
    expect(a.deal.id).not.toBe(b.deal.id);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesContacts("bravo")).toHaveLength(1);
  });
});
