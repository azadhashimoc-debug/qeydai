/**
 * CI ONLY: provision a disposable PostgreSQL database with the actual migration
 * files, then grant table access to a NON-superuser role. Never run on production.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

if (!process.env.CI || !process.env.PG_ADMIN_URL) {
  throw new Error("Refusing to provision PostgreSQL outside CI with PG_ADMIN_URL");
}
const pool = new pg.Pool({ connectionString: process.env.PG_ADMIN_URL });
try {
  for (const migration of [
    "0001_init.sql",
    "0002_crm_inbox.sql",
    "0003_sales_workspace.sql",
    "0004_panel_jti.sql",
    "0005_analytics_ingest.sql",
    "0006_ai_settings.sql",
  ]) {
    const sql = readFileSync(resolve("db", "migrations", migration), "utf8");
    await pool.query(sql);
    console.log("Applied", migration);
  }
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'panelim_ci') THEN
        CREATE ROLE panelim_ci LOGIN PASSWORD 'local_app_password';
      END IF;
    END $$;
    GRANT CONNECT ON DATABASE panelim_ci TO panelim_ci;
    GRANT USAGE ON SCHEMA public TO panelim_ci;
    -- General CRM grants apply only to tenant tables. Marketing analytics
    -- has FORCE RLS but must remain INSERT-only (no SELECT/UPDATE/DELETE).
    DO $grants$
    DECLARE t text;
    BEGIN
      FOR t IN
        SELECT c.relname FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind='r'
          AND c.relrowsecurity AND c.relforcerowsecurity
          AND c.relname <> 'analytics_events'
      LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO panelim_ci', t);
      END LOOP;
    END $grants$;
    GRANT INSERT (event, locale, props) ON TABLE public.analytics_events TO panelim_ci;
  `);
  const rls = await pool.query(`
    SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity,
           c.relforcerowsecurity AS forcerowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('sales_contacts', 'sales_deals', 'sales_tasks', 'panel_revoked_jti')
  `);
  if (rls.rows.length !== 4 || rls.rows.some((r) => !r.rowsecurity || !r.forcerowsecurity)) {
    throw new Error("Required PostgreSQL RLS policies are not enabled and forced");
  }
  console.log("PostgreSQL schema, app role and forced RLS verified.");
} finally {
  await pool.end();
}
