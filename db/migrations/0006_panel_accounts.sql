-- Email/password accounts are separate from legacy administrator access keys.
CREATE TABLE IF NOT EXISTS panel_accounts (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  CHECK (length(email) BETWEEN 3 AND 254),
  CHECK (length(password_hash) BETWEEN 40 AND 512)
);
CREATE INDEX IF NOT EXISTS panel_accounts_tenant_idx ON panel_accounts(tenant_id);
ALTER TABLE panel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_accounts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS panel_accounts_scope ON panel_accounts;
CREATE POLICY panel_accounts_scope ON panel_accounts
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
    OR email = NULLIF(current_setting('app.auth_email', true), '')
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
