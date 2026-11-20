import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SqliteEnrollmentStore } from "@/lib/enrollment/sqlite-store";

let store: SqliteEnrollmentStore;
vi.mock("@/lib/api/instance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/instance")>("@/lib/api/instance");
  return { ...actual, getSharedStore: () => store };
});

import {
  adminKeyFingerprint, createPanelSessionToken, derivePanelSecret, PANEL_COOKIE_NAME,
} from "@/lib/api/panel-auth";
import { POST } from "./route";

const ALPHA = "intake-alpha-key-0123456789abcdef";
const BRAVO = "intake-bravo-key-0123456789abcdef";
const keys = { [ALPHA]: "alpha", [BRAVO]: "bravo" };
const secret = "intake-session-secret-0123456789abcdef";

function request(tenant: "alpha" | "bravo", input: unknown, memberId?: string, origin = "http://localhost:3000") {
  const key = tenant === "alpha" ? ALPHA : BRAVO;
  const token = createPanelSessionToken(
    tenant, derivePanelSecret(keys, secret)!, Date.now(), 3600_000,
    adminKeyFingerprint(key), memberId,
  );
  return new Request("http://localhost:3000/api/panel/intake", {
    method: "POST",
    headers: {
      cookie: `${PANEL_COOKIE_NAME}=${token}`,
      origin,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

describe("CRM atomic intake", () => {
  const old = {
    admin: process.env.QEYDAI_ADMIN_KEYS,
    secret: process.env.QEYDAI_PANEL_SECRET,
    database: process.env.QEYDAI_DATABASE_URL,
  };
  beforeEach(async () => {
    delete process.env.QEYDAI_DATABASE_URL;
    process.env.QEYDAI_ADMIN_KEYS = JSON.stringify(keys);
    process.env.QEYDAI_PANEL_SECRET = secret;
    store = new SqliteEnrollmentStore(":memory:");
    store.initializeSalesWorkspace("alpha");
    store.initializeSalesWorkspace("bravo");
    await store.createSalesMember("alpha", "operator1", "Operator", "operator");
  });
  afterEach(() => {
    store.close();
    if (old.admin === undefined) delete process.env.QEYDAI_ADMIN_KEYS;
    else process.env.QEYDAI_ADMIN_KEYS = old.admin;
    if (old.secret === undefined) delete process.env.QEYDAI_PANEL_SECRET;
    else process.env.QEYDAI_PANEL_SECRET = old.secret;
    if (old.database === undefined) delete process.env.QEYDAI_DATABASE_URL;
    else process.env.QEYDAI_DATABASE_URL = old.database;
  });

  const input = { name: "Aysel", phone: "050 123 45 67", title: "Saç kəsimi", message: "Sabah boş yer var?", source: "manual" };

  it("creates contact, deal and follow-up task in the same workspace", async () => {
    const result = await POST(request("alpha", input));
    expect(result.status).toBe(201);
    const json = await result.json();
    expect(json.contact.phone).toBe("+994501234567");
    expect(json.deal.contactId).toBe(json.contact.id);
    expect(json.task.dealId).toBe(json.deal.id);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesDeals("alpha")).toHaveLength(1);
    expect(await store.listSalesTasks("alpha")).toHaveLength(1);
    expect(await store.listSalesContacts("bravo")).toHaveLength(0);
  });

  it("reuses an existing contact without creating a second customer", async () => {
    expect((await POST(request("alpha", input))).status).toBe(201);
    const second = await POST(request("alpha", { ...input, title: "Rəngləmə" }));
    expect(second.status).toBe(201);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesDeals("alpha")).toHaveLength(2);
  });

  it("blocks operators, cross-origin requests and invalid payloads", async () => {
    expect((await POST(request("alpha", input, "operator1"))).status).toBe(403);
    expect((await POST(request("alpha", input, undefined, "https://evil.example"))).status).toBe(403);
    expect((await POST(request("alpha", { ...input, message: "" }))).status).toBe(422);
    expect(await store.listSalesContacts("alpha")).toHaveLength(0);
  });

  it("isolates matching phone numbers by tenant", async () => {
    const a = await (await POST(request("alpha", input))).json();
    const b = await (await POST(request("bravo", input))).json();
    expect(a.contact.id).not.toBe(b.contact.id);
    expect(await store.listSalesContacts("alpha")).toHaveLength(1);
    expect(await store.listSalesContacts("bravo")).toHaveLength(1);
  });
});
