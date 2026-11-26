import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminKeyFingerprint, createPanelSessionToken, derivePanelSecret, PANEL_COOKIE_NAME,
} from "@/lib/api/panel-auth";
import { GET, PATCH, POST } from "./route";
import { workspaceTransaction } from "@/lib/crm/store";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const tenantA = "contact_a_" + randomUUID().slice(0, 16);
const tenantB = "contact_b_" + randomUUID().slice(0, 16);
const keyA = "contact-test-alpha-0123456789abcdef";
const keyB = "contact-test-beta-0123456789abcdef";
const keys = { [keyA]: tenantA, [keyB]: tenantB };
const secret = "contact-test-secret-0123456789abcdef";
const previous = {
  keys: process.env.QEYDAI_ADMIN_KEYS,
  secret: process.env.QEYDAI_PANEL_SECRET,
};

function request(method: string, tenant: string, id?: string, body?: unknown): Request {
  const key = tenant === tenantA ? keyA : keyB;
  const token = createPanelSessionToken(
    tenant, derivePanelSecret(keys, secret)!, Date.now(), 3_600_000, adminKeyFingerprint(key),
  );
  return new Request(`http://localhost:3000/api/panel/contacts${id ? `?id=${id}` : ""}`, {
    method,
    headers: {
      origin: "http://localhost:3000",
      cookie: `${PANEL_COOKIE_NAME}=${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

suite("CRM contacts PostgreSQL update and tenant isolation", () => {
  beforeAll(() => {
    process.env.QEYDAI_ADMIN_KEYS = JSON.stringify(keys);
    process.env.QEYDAI_PANEL_SECRET = secret;
  });
  afterAll(async () => {
    // Each test run uses random tenant IDs. Cleanup is scoped strictly to those tenants.
    for (const tenant of [tenantA, tenantB]) {
      await workspaceTransaction(tenant, async (db) => {
        await db.query("DELETE FROM sales_contacts WHERE tenant_id=$1", [tenant]);
        await db.query("DELETE FROM sales_stages WHERE tenant_id=$1", [tenant]);
        await db.query("DELETE FROM sales_workspaces WHERE id=$1", [tenant]);
      });
    }
    if (previous.keys === undefined) delete process.env.QEYDAI_ADMIN_KEYS;
    else process.env.QEYDAI_ADMIN_KEYS = previous.keys;
    if (previous.secret === undefined) delete process.env.QEYDAI_PANEL_SECRET;
    else process.env.QEYDAI_PANEL_SECRET = previous.secret;
  });

  it("edits the contact and reads back persistent values", async () => {
    const created = await POST(request("POST", tenantA, undefined, { name: "Səbinə", phone: "050 555 12 34" }));
    expect(created.status).toBe(201);
    const { contact } = await created.json();
    const updated = await PATCH(request("PATCH", tenantA, contact.id, { name: "Səbinə Məmmədova" }));
    expect(updated.status).toBe(200);
    const fetched = await GET(request("GET", tenantA, contact.id));
    expect(fetched.status).toBe(200);
    expect((await fetched.json()).contact.name).toBe("Səbinə Məmmədova");
  });

  it("rejects cross-tenant edits and malformed updates", async () => {
    const created = await POST(request("POST", tenantA, undefined, { name: "Müştəri test" }));
    expect(created.status).toBe(201);
    const { contact } = await created.json();
    expect((await PATCH(request("PATCH", tenantB, contact.id, { name: "Hijack" }))).status).toBe(404);
    expect((await PATCH(request("PATCH", tenantA, contact.id, { name: "" }))).status).toBe(422);
    expect((await GET(request("GET", tenantA, contact.id))).status).toBe(200);
  });

  it("rejects conflicting phone updates without overwriting another contact", async () => {
    const first = await POST(request("POST", tenantA, undefined, { name: "Birinci", phone: "050 441 22 33" }));
    const second = await POST(request("POST", tenantA, undefined, { name: "İkinci", phone: "050 441 22 44" }));
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const { contact: a } = await first.json();
    const { contact: b } = await second.json();
    expect((await PATCH(request("PATCH", tenantA, b.id, { phone: a.phone }))).status).toBe(409);
    const unchanged = await (await GET(request("GET", tenantA, b.id))).json();
    expect(unchanged.contact.phone).toBe(b.phone);
  });
});
