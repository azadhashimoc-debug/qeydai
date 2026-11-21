import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createPanelApi } from "./panel-api";
import { getPanelAuthConfig, setPanelJtiStore } from "./panel-auth";
import { PostgresEnrollmentStore, type PgPool } from "../enrollment/postgres-store";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const tenant = "pg_auth_" + randomUUID().slice(0, 20);
const key = "panel-pg-auth-key-0123456789abcdefgh";
const origin = "https://panelim.test";
const config = getPanelAuthConfig({
  QEYDAI_ADMIN_KEYS: JSON.stringify({ [key]: tenant }),
  QEYDAI_PANEL_SECRET: "pg-test-signing-secret-0123456789abcdefgh",
  NODE_ENV: "test",
} as NodeJS.ProcessEnv);

suite("Panel sessions: persistent PostgreSQL revocation across instances", () => {
  let a: Pool;
  let b: Pool;
  let first: PostgresEnrollmentStore;
  let second: PostgresEnrollmentStore;

  beforeAll(() => {
    a = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL, max: 2 });
    b = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL, max: 2 });
    first = new PostgresEnrollmentStore(a as unknown as PgPool);
    second = new PostgresEnrollmentStore(b as unknown as PgPool);
  });

  afterAll(async () => {
    // Scope cleanup to this randomly generated test tenant. No production data touched.
    if (a) {
      const client = await a.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
        await client.query("DELETE FROM panel_revoked_jti WHERE tenant_id=$1", [tenant]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
      await a.end();
    }
    if (b) await b.end();
    setPanelJtiStore(null);
  });

  it("logs in on A, authenticates on B, revokes on A, rejects on B", async () => {
    const apiA = createPanelApi({ store: first, getAuthConfig: () => config });
    const apiB = createPanelApi({ store: second, getAuthConfig: () => config });
    setPanelJtiStore(first);
    const login = await apiA.authPost(new Request(origin + "/api/panel/auth", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ key }),
    }));
    expect(login.status).toBe(200);
    const setCookie = login.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    const cookie = setCookie.split(";")[0];
    const req = (method: "GET" | "DELETE") => new Request(origin + "/api/panel/auth", {
      method, headers: { origin, cookie },
    });
    expect((await apiA.authGet(req("GET"))).status).toBe(200);
    setPanelJtiStore(second);
    expect((await apiB.authGet(req("GET"))).status).toBe(200);
    setPanelJtiStore(first);
    expect((await apiA.authDelete(req("DELETE"))).status).toBe(200);
    setPanelJtiStore(second);
    expect((await apiB.authGet(req("GET"))).status).toBe(401);
    setPanelJtiStore(first);
    expect((await apiA.authGet(req("GET"))).status).toBe(401);
  });

  it("checks the database connection is non-owner and subject to forced tenant RLS", async () => {
    const c = await a.connect();
    try {
      const role = await c.query<{ rolsuper: boolean; rolbypassrls: boolean; owns_sessions: boolean }>(`
        SELECT r.rolsuper, r.rolbypassrls, EXISTS (
          SELECT 1 FROM pg_class t WHERE t.oid='public.sessions'::regclass AND t.relowner=r.oid
        ) AS owns_sessions FROM pg_roles r WHERE r.rolname=current_user
      `);
      expect(role.rows[0]).toMatchObject({
        rolsuper: false, rolbypassrls: false, owns_sessions: false,
      });
      const rls = await c.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='public.panel_revoked_jti'::regclass",
      );
      expect(rls.rows[0]).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true });
    } finally {
      c.release();
    }
  });

  it("does not expose a different tenant's revocations through RLS", async () => {
    await first.revokePanelJti("cross-tenant-probe-jti", Date.now() + 60_000, tenant);
    expect(await first.isPanelJtiRevoked("cross-tenant-probe-jti", Date.now(), tenant)).toBe(true);
    expect(await second.isPanelJtiRevoked("cross-tenant-probe-jti", Date.now(), "unrelated_tenant")).toBe(false);
  });
});
