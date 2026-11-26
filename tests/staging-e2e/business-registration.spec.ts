import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { E2E_BASE_URL } from "../../playwright.config";

// Staging only: the workflow explicitly verifies Neon host, role and DB.
// Tests use unique disposable identities and remove only their own data.
test("AZ business signup, password sign-in, CRM contact, and logout (no access key)", async ({ page }) => {
  const stamp = randomUUID().replace(/-/g, "").slice(0, 18);
  const email = `qa-${stamp}@example.test`;
  const password = `TestCRM!LongPass-${stamp}`;
  const company = `Test Biznes ${stamp}`;
  const headers = { origin: E2E_BASE_URL };
  let contactId: string | null = null;

  try {
    await page.goto("/az/register");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('form.pm-auth-form button[type="submit"]').click();
    await page.locator('input[name="name"]').fill(company);
    await page.locator('input[name="phone"]').fill("050 555 12 34");
    await page.locator('input[name="password"]').fill(password);
    const created = page.waitForResponse(r =>
      r.url().endsWith("/api/panel/account/register") && r.request().method() === "POST"
    );
    await page.locator('form.pm-auth-form button[type="submit"]').click();
    expect((await created).status()).toBe(200);
    await expect(page.locator(".js-create-account")).toBeVisible();
    await page.locator('input[name="account"]').fill(company);
    await page.locator(".js-create-account-submit-button").click();
    await page.waitForURL("**/az/panel", { timeout: 20_000 });
    expect((await page.request.get("/api/panel/contacts")).status()).toBe(200);

    const createdContact = await page.request.post("/api/panel/contacts", {
      headers,
      data: { name: "Hesab sahibi müştərisi " + stamp },
    });
    expect(createdContact.status()).toBe(201);
    contactId = (await createdContact.json()).contact.id as string;
    const list = await page.request.get("/api/panel/contacts");
    expect(list.status()).toBe(200);
    expect((await list.json()).contacts.some((c: { id: string }) => c.id === contactId)).toBe(true);

    // Logout revokes the persistent JTI; email/password login succeeds without a key.
    expect((await page.request.delete("/api/panel/auth", { headers })).status()).toBe(200);
    expect((await page.request.get("/api/panel/contacts")).status()).toBe(401);
    await page.goto("/az/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="key"]').fill(password);
    const signedIn = page.waitForResponse(r =>
      r.url().endsWith("/api/panel/account/login") && r.request().method() === "POST"
    );
    await page.locator('form.pm-auth-form button[type="submit"]').click();
    expect((await signedIn).status()).toBe(200);
    await page.waitForURL("**/az/panel", { timeout: 20_000 });
    expect((await page.request.get("/api/panel/contacts")).status()).toBe(200);
  } finally {
    // Re-login if necessary to delete the disposable contact through tenant API.
    if (contactId) {
      const check = await page.request.get("/api/panel/contacts").catch(() => null);
      if (!check || check.status() !== 200) {
        await page.request.post("/api/panel/account/login", {
          headers, data: { email, password },
        }).catch(() => {});
      }
      const removed = await page.request.delete(
        "/api/panel/contacts?id=" + encodeURIComponent(contactId), { headers }
      );
      expect(removed.status()).toBe(200);
    }

    // Even if the UI fails after successful signup, look up only this unique
    // test email under the app's own RLS policy and clean its own tenant.
    const pool = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL!, max: 1 });
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("SELECT set_config('app.auth_email',$1,true)", [email]);
      const rows = await db.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM panel_accounts WHERE email=$1", [email]
      );
      const tenant = rows.rows[0]?.tenant_id;
      if (tenant) {
        await db.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
        await db.query("DELETE FROM panel_revoked_jti WHERE tenant_id=$1", [tenant]);
        await db.query("DELETE FROM panel_accounts WHERE tenant_id=$1 AND email=$2", [tenant, email]);
        await db.query("DELETE FROM sales_stages WHERE tenant_id=$1", [tenant]);
        await db.query("DELETE FROM sales_workspaces WHERE id=$1", [tenant]);
      }
      await db.query("COMMIT");
    } catch (e) {
      await db.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      db.release();
      await pool.end();
    }
  }
});
