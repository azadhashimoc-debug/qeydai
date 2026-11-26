import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerBusiness, loginBusiness, readAccountSession } from "@/lib/api/account-auth";
import { createPanelApi } from "@/lib/api/panel-api";
import { PostgresEnrollmentStore } from "@/lib/enrollment/postgres-store";
import { Pool } from "pg";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const secret = "ci-business-account-secret-0123456789abcdef";
const email = `crm-${randomUUID()}@example.test`;
const password = "Correct-Horse-Tea-2026";
const prev = {
  keys: process.env.QEYDAI_ADMIN_KEYS,
  secret: process.env.QEYDAI_PANEL_SECRET,
};
let pool: Pool;
let tenant = "";
let cookie = "";
const origin = "http://localhost:3000";
function req(route: string, value: unknown): Request {
  return new Request(origin + route, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}
suite("business account registration and persistent sign-in with PostgreSQL", () => {
  beforeAll(() => {
    process.env.QEYDAI_ADMIN_KEYS = "{}";
    process.env.QEYDAI_PANEL_SECRET = secret;
    pool = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL });
  });
  afterAll(async () => {
    if (tenant) {
      const db = await pool.connect();
      try {
        await db.query("BEGIN");
        await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
        await db.query("DELETE FROM panel_revoked_jti WHERE tenant_id=$1", [tenant]);
        await db.query("DELETE FROM panel_accounts WHERE tenant_id=$1", [tenant]);
        await db.query("DELETE FROM sales_stages WHERE tenant_id=$1", [tenant]);
        await db.query("DELETE FROM sales_workspaces WHERE id=$1", [tenant]);
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        db.release();
      }
    }
    await pool.end();
    if (prev.keys === undefined) delete process.env.QEYDAI_ADMIN_KEYS;
    else process.env.QEYDAI_ADMIN_KEYS = prev.keys;
    if (prev.secret === undefined) delete process.env.QEYDAI_PANEL_SECRET;
    else process.env.QEYDAI_PANEL_SECRET = prev.secret;
  });

  it("registers an isolated workspace and signs in without an access key", async () => {
    const register = await registerBusiness(req("/api/panel/account/register", {
      businessName: "CRM Test Biznes", email, password,
    }));
    expect(register.status).toBe(200);
    const data = await register.json();
    tenant = data.tenantId;
    expect(tenant).toMatch(/^biz_/);
    cookie = register.headers.get("set-cookie")!.split(";")[0];
    expect(cookie).toContain("qeydai_panel=");
    const sessionReq = new Request(origin + "/api/panel/auth", { headers: { cookie } });
    expect((await readAccountSession(sessionReq))?.tenantId).toBe(tenant);

    const login = await loginBusiness(req("/api/panel/account/login", { email, password }));
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("hides duplicate signup without issuing a session and rejects incorrect passwords", async () => {
    const duplicate = await registerBusiness(req("/api/panel/account/register", {
      businessName: "Different Business", email, password,
    }));
    expect(duplicate.status).toBe(202);
    expect(duplicate.headers.get("set-cookie")).toBeNull();
    expect(await duplicate.json()).toEqual({ ok: true, verificationRequired: true });
    expect((await loginBusiness(req("/api/panel/account/login", {
      email, password: "not-the-right-password",
    }))).status).toBe(401);
  });

  it("locks out repeated sign-in attempts for one email and treats unknown emails alike", async () => {
    const target = `lockout-${randomUUID()}@example.test`;
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await loginBusiness(req("/api/panel/account/login", {
        email: target, password: "wrong-password-attempt",
      }))).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("persists account sessions and revokes them on sign-out", async () => {
    const api = createPanelApi({ store: new PostgresEnrollmentStore(pool) });
    const loggedIn = new Request(origin + "/api/panel/auth", { headers: { cookie } });
    expect((await api.authGet(loggedIn)).status).toBe(200);
    const logout = await api.authDelete(new Request(origin + "/api/panel/auth", {
      method: "DELETE", headers: { cookie, origin },
    }));
    expect(logout.status).toBe(200);
    expect((await api.authGet(loggedIn)).status).toBe(401);
  });
});
