# panelim.az — Production release gate (PR #7)

Updated for branch `feat/pani-crm-intake-core`. **Do not execute production SQL, modify Vercel secrets, or merge without separate approval.**

## Actual staging observations (2026-11-21)
- Neon project `neon-bisque-marble`, staging branch, database `neondb`.
- 24 public tables; 22 have RLS enabled **and forced**.
- Application login `panelim_staging_app` is not superuser and has no BYPASSRLS.
- SELECT under no tenant context returns no tenant rows; tenant-scoped read-only probe succeeds.
- **Finding:** staging app login currently has full CRUD on unprotected `leads` and `analytics_events`. This is excessive. Do not copy its grants to production.
- Existing Playwright server sets `QEYDAI_E2E_SQLITE=1`; its passing suite is **not** proof of staging-backed browser E2E.
- Staging direct-DB route tests have not been rerun against the staging connection in this operation; they require a safely provided limited staging DATABASE_URL to an isolated test worker. Do not execute against production.

## Authorized production execution order (future only)
1. Confirm change window, database backup/restore-point strategy, verified rollback branch, and production traffic freeze as applicable.
2. Export a private migration inventory / checksum for `0001_init.sql`, `0002_crm_inbox.sql`, `0003_sales_workspace.sql`, `0004_panel_jti.sql`, `0005_analytics_ingest.sql`. Run dry-run on a **fresh disposable branch created from production main** first. The current staging branch is a descendant and is not a clean-main rehearsal.
3. With a dedicated migration owner **on main only after approval**, apply exact committed migration files in numerical order `0001` → `0002` → `0003` → `0004` → `0005` using stop-on-error. Do not attempt a combined retry after partial execution without reviewing applied objects; scripts use `IF NOT EXISTS` but are not an all-purpose rollback mechanism.
4. Verify 24 expected tables, 22 tenant-isolated tables with both `relrowsecurity` and `relforcerowsecurity`, policy definitions, indexes, constraints, and the existence of `panel_revoked_jti`. Confirm non-RLS tables `leads` / `analytics_events` are NOT available to the app role.
5. Create the restricted production LOGIN role with secret-manager generated password. Example **operator-reviewed** role DDL below (not executed).
6. In Vercel project → Settings → Environment Variables, verify the **username only** embedded in `QEYDAI_DATABASE_URL` per environment (Production vs Preview); do not reveal or log any URI/token/password. It must match `panelim_production_app`, not `neondb_owner`. Confirm the host/branch targets production main without showing credential values. Apply secret change ONLY with explicit approval.
7. Build + deploy the reviewed commit (after Vercel rate limit clears), verify runtime role in a non-leaking diagnostic, then smoke test HTTPS, login, cookie persistence across instances, sign-out JTI revocation after cold start, CRM contact → deal → task, idempotency, rollback, denied tenant access and logs. Only then promote traffic.

## Template: production app role SQL (requires approval; do not execute yet)

The password must be assigned securely by the operator, outside version control. Replace no secrets in this document.

```sql
-- Run as migration/DB administrator ONLY after explicit production approval.
CREATE ROLE panelim_production_app
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
  NOBYPASSRLS NOINHERIT;
-- SET ROLE PASSWORD securely in the console/secret manager; never put a literal password in PRs or logs.
GRANT CONNECT ON DATABASE neondb TO panelim_production_app;
GRANT USAGE ON SCHEMA public TO panelim_production_app;
-- Explicit allowlist; intentionally omit legacy leads and analytics_events.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sessions','enrollments','crm_leads','inbox_messages','panel_revoked_jti',
    'sales_workspaces','sales_members','sales_member_keys','sales_stages',
    'sales_contacts','sales_phone_matches','sales_deals','sales_custom_field_defs',
    'sales_deal_field_values','sales_connections','sales_threads','sales_messages',
    'sales_outbox','sales_activity','sales_tasks','sales_notes','sales_deal_bookings'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relkind='r'
        AND c.relrowsecurity AND c.relforcerowsecurity
    ) THEN
      RAISE EXCEPTION 'Tenant RLS missing for %',t;
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO panelim_production_app',t);
  END LOOP;
END $$;
```

If sequences are actually used by an allowlisted table, determine the exact sequences and grant only necessary usage; do not grant `ALL SEQUENCES` by default. Test runtime default privileges and all routes under this restricted role before traffic promotion.

## Runtime assurance probes (do not print credentials)
```sql
SELECT current_user, session_user;
SELECT rolsuper,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=current_user;
SELECT relname,relrowsecurity,relforcerowsecurity
FROM pg_class WHERE oid IN ('public.sessions'::regclass,'public.sales_contacts'::regclass,'public.panel_revoked_jti'::regclass);
SELECT has_table_privilege(current_user,'public.leads','SELECT') AS legacy_leads_access,
       has_table_privilege(current_user,'public.analytics_events','SELECT') AS analytics_access;
```

Reject release if privileged/runtime role, broad unprotected-table grants, any RLS failures, failed app-level Neon E2E, or missing shared revocation are found.

## Rollback
- **Before traffic switch:** abort deployment; leave old application live; production migrations are additive and must not be blindly reversed.
- **After traffic switch:** redeploy known-good release, subject to schema compatibility. Verify old app does not rely on unsafe SQLite fallback or owner DB role. If it does, block rollback-to-old-binary and use an approved hotfix instead.
- Retain an approved Neon restore point / protected snapshot before applying schema, and rehearse restore on a separate branch. A restore of production data is potentially destructive and requires a second authorization.
- Rotate/revoke leaked credentials if any exposure occurs. Do not log connection strings.

## Approval checklist
- [ ] Approve production-main migration window and validated restore point.
- [ ] Approve running `0001` → `0005` on main after successful disposable-branch rehearsal.
- [ ] Approve `panelim_production_app` provisioning and least-privilege grants.
- [ ] Approve Vercel production `QEYDAI_DATABASE_URL` replacement after role-only inspection.
- [ ] Approve deployment once Vercel is unblocked and staging-backed application E2E passes.
- [ ] Separately approve PR merge; do not infer merge authorization from release approval.

## Update: migration 0005 (analytics ingest)
`0005_analytics_ingest.sql` enables and forces RLS on `analytics_events`, allows app roles INSERT-only on `(event, locale, props)` and restricts SELECT/DELETE to the owner. This addresses the staging finding about excess CRUD on `analytics_events`. The legacy `leads` table is still outside the RLS allowlist: confirm the app role has no access to it before release. Re-run the runtime probes above after applying `0005`.
