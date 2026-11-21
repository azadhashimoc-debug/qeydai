# Production persistence and RLS handoff (PR #7)

## Scope and status

This PR replaces SQLite-backed production enrollment/panel API state and local
JTI revocation with PostgreSQL. It intentionally does **not** update any
Vercel environment variables, change the Neon production branch, merge the PR,
or deploy a new version.

Production rollout is **BLOCKED** until a human validates that the current
`QEYDAI_DATABASE_URL` connection uses a limited non-owner role, and provisions
that role on the production branch outside this PR. Do not paste secrets into
issues, logs or pull-request comments.

### Required production role (operator procedure only; do not auto-run)

1. In the Neon **production/main** branch (only after an approved change
   window), provision a **new** login role such as `panelim_production_app`.
   It must have `NOSUPERUSER NOBYPASSRLS NOINHERIT`, must not own application
   tables, and must not inherit an owner/BYPASSRLS role. Generate its password
   in a secret manager; no secrets are stored in this repository.
2. Grant `CONNECT` on `neondb` and `USAGE` on schema `public`. Grant only
   `SELECT,INSERT,UPDATE,DELETE` for tenant-isolated tables:
   `sessions`, `enrollments`, `crm_leads`, `inbox_messages`,
   `panel_revoked_jti`, and the existing `sales_*` tables. Grant necessary
   sequence `USAGE/SELECT` only where used. Do not automatically grant all
   new public tables: `analytics_events` and legacy `leads` have no tenant
   RLS and should be handled separately.
3. Apply `0004_panel_jti.sql` as a controlled additive migration (after
   `0001`–`0003`); verify tenant policies are enabled **and forced** for
   every tenant table. Confirm no `BYPASSRLS` and that role is not the
   table owner. Rehearse against staging before production.
4. Inspect only the **username component** of the configured Vercel
   `QEYDAI_DATABASE_URL` securely (do not print the URL). Update the
   production secret only in an explicitly authorized deployment/change window,
   and redeploy after migration and app-role verification. This PR does not
   perform that step.
5. Confirm `QEYDAI_ADMIN_KEYS` and (ideally) independent
   `QEYDAI_PANEL_SECRET` are available consistently on all instances.
   They determine signed-cookie verification. Run login on instance A,
   inspect on B, sign out on A, then verify 401 on B. Verify that a
   revoked JTI remains rejected after a cold start.
6. Do not treat Neon's `neon_auth` schema as the application's login provider.
   This PR continues to use the existing HMAC/session/admin-key mechanism.
   Migrating to Neon Auth would be a separate reviewed feature.

### Release gates

- Non-superuser/non-BYPASSRLS/tenant RLS verified on actual runtime credentials.
- No ephemeral SQLite persistence or in-memory-only revocation in production.
- PostgreSQL integration tests, unit tests, build and desktop/mobile Playwright all green.
- Tenant-isolated CRM intake, idempotent replay, 409 conflicts, rollback,
  member authorization and logout revocation proven with a non-owner role.
- No secret values committed or displayed.
- `main` branch untouched until separately authorized.

### Tested staging branch

`neon-bisque-marble / staging / neondb`:
`panelim_staging_app` was verified as a non-superuser and
`NOBYPASSRLS`; forced tenant RLS was observed. An additive JTI table,
tenant policy and role grants were applied in staging only. Test transactions
inserted sessions and an example contact → deal → task chain, switched tenant
context to check visibility, and ended with `ROLLBACK`. Subsequent queries
confirmed **zero** test rows. This is a SQL-level staging integration probe,
not a claim that Vercel production has been validated or that the full Next.js
E2E suite was run directly against Neon staging.

### Operational note

Application's PostgreSQL guard refuses production owner/superuser/BYPASSRLS
connections. If the currently configured Vercel connection uses
`neondb_owner`, the new application will intentionally become unavailable
rather than bypass RLS. Provision and verify the limited role **before**
deployment; do not bypass this guard to make a deployment green.
