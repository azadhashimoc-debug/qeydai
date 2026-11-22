-- Social sign-in accounts (Google / Facebook). One row per provider identity; each account owns one
-- workspace (tenant) through a member row. Identity is (provider, provider_user_id); e-mail is display
-- data only and is never used to link accounts (an unverified provider e-mail must not take over a workspace).
-- Additive only. This table is global (looked up before any tenant is known), so it has no tenant RLS;
-- the app role gets SELECT, INSERT, UPDATE only. Grant after applying:
--   GRANT SELECT, INSERT, UPDATE ON public.panel_accounts TO <app role>;
CREATE TABLE IF NOT EXISTS panel_accounts (
  id text PRIMARY KEY CHECK (length(id) BETWEEN 8 AND 64),
  provider text NOT NULL CHECK (provider IN ('google','facebook')),
  provider_user_id text NOT NULL CHECK (length(provider_user_id) BETWEEN 1 AND 128),
  email text CHECK (email IS NULL OR length(email) <= 254),
  name text NOT NULL DEFAULT '' CHECK (length(name) <= 120),
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  member_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id),
  FOREIGN KEY (tenant_id, member_id) REFERENCES sales_members(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS panel_accounts_tenant_idx ON panel_accounts(tenant_id);

DO $roles$
DECLARE app_role text;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['panelim_production_app', 'panelim_staging_app'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.panel_accounts TO %I', app_role);
    END IF;
  END LOOP;
END $roles$;
