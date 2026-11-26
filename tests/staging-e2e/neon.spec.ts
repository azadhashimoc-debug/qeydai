import { randomInt } from "node:crypto";
import { Pool } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { E2E_BASE_URL } from "../../playwright.config";

const tenantA = process.env.STAGING_E2E_TENANT_A!;
const tenantB = process.env.STAGING_E2E_TENANT_B!;
const adminA = process.env.STAGING_E2E_ADMIN_KEY_A!;
const adminB = process.env.STAGING_E2E_ADMIN_KEY_B!;
const apiB = process.env.STAGING_E2E_API_KEY_B!;
const dbUrl = process.env.QEYDAI_DATABASE_URL!;
const phone = `+99477${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
const leadName = `Staging E2E ${tenantB}`;
let leadId: string | null = null;

async function signIn(page: Page, key: string) {
  await page.goto("/en/login");
  await page.getByRole("button", { name: "Access key", exact: true }).click();
  await page.getByLabel("Email").fill("staging-e2e@example.test");
  await page.getByLabel("Workspace access key").fill(key);
  const resPromise = page.waitForResponse((r) =>
    r.url().endsWith("/api/panel/auth") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Sign in to panel" }).click();
  expect((await resPromise).status()).toBe(200);
}

test.describe("real Neon staging Next.js HTTP + browser E2E", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const pool = new Pool({ connectionString: dbUrl, max: 1 });
    try {
      const result = await pool.query<{
        rolname: string; rolsuper: boolean; rolbypassrls: boolean;
        owns_sessions: boolean; forced: boolean;
      }>(`SELECT r.rolname,r.rolsuper,r.rolbypassrls,
          EXISTS(SELECT 1 FROM pg_class WHERE oid='public.sessions'::regclass
                 AND relowner=r.oid) AS owns_sessions,
          (SELECT relforcerowsecurity FROM pg_class
           WHERE oid='public.panel_revoked_jti'::regclass) AS forced
          FROM pg_roles r WHERE rolname=current_user`);
      expect(result.rows[0]).toMatchObject({
        rolname: "panelim_staging_app",
        rolsuper: false, rolbypassrls: false,
        owns_sessions: false, forced: true,
      });
    } finally {
      await pool.end();
    }
  });

  test.afterAll(async () => {
    const pool = new Pool({ connectionString: dbUrl, max: 1 });
    try {
      // Cleanup by the two generated test tenants ONLY; no other tenant touched.
      for (const [tenant, deleteLead] of [[tenantA, false], [tenantB, true]] as const) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
          if (deleteLead && leadId) {
            await client.query("DELETE FROM crm_leads WHERE tenant_id=$1 AND id=$2", [tenant, leadId]);
          }
          await client.query("DELETE FROM panel_revoked_jti WHERE tenant_id=$1", [tenant]);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally { client.release(); }
      }
    } finally { await pool.end(); }
  });

  test("browser login, real persistent JTI revocation, and post-logout 401", async ({ page }) => {
    const unauth = await page.request.get("/api/panel/auth");
    expect(unauth.status()).toBe(401);

    await signIn(page, adminA);
    const session = await page.request.get("/api/panel/auth");
    expect(session.status()).toBe(200);
    expect((await session.json()).tenantId).toBe(tenantA);
    await page.reload();
    expect((await page.request.get("/api/panel/auth")).status()).toBe(200);

    const logout = await page.request.delete("/api/panel/auth", {
      headers: { origin: E2E_BASE_URL },
    });
    expect(logout.status()).toBe(200);
    expect((await page.request.get("/api/panel/auth")).status()).toBe(401);

    const pool = new Pool({ connectionString: dbUrl, max: 1 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenantA]);
      const rows = await client.query(
        "SELECT count(*)::int AS n FROM panel_revoked_jti WHERE tenant_id=$1", [tenantA]);
      expect(rows.rows[0].n).toBeGreaterThan(0);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally { client.release(); await pool.end(); }
  });

  test("HTTP lead persists in staging and cannot be seen by a second tenant", async ({ page, browser, request }) => {
    const created = await request.post("/api/v1/leads", {
      headers: { authorization: `Bearer ${apiB}`, "content-type": "application/json" },
      data: { name: leadName, phone, source: "telegram", note: "staging isolated test" },
    });
    expect(created.status()).toBe(201);
    leadId = (await created.json()).leadId as string;

    await signIn(page, adminA);
    const hidden = await page.request.get("/api/panel/leads");
    expect(hidden.status()).toBe(200);
    expect((await hidden.json()).leads.some((lead: { id: string }) => lead.id === leadId)).toBe(false);

    const contextB = await browser.newContext();
    try {
      const pageB = await contextB.newPage();
      await signIn(pageB, adminB);
      const visible = await pageB.request.get("/api/panel/leads");
      expect(visible.status()).toBe(200);
      expect((await visible.json()).leads.some((lead: { id: string }) => lead.id === leadId)).toBe(true);
    } finally { await contextB.close(); }
  });
});
