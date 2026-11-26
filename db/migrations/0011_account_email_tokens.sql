SET lock_timeout = '5s';

-- Track email verification status on panel_accounts and store single-use hashed
-- tokens for email verification and password reset flows.
ALTER TABLE panel_accounts
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS panel_account_tokens (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  tenant_id text NOT NULL REFERENCES sales_workspaces(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  kind text NOT NULL CHECK (kind IN ('verify_email', 'reset_password')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, account_id) REFERENCES panel_accounts(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS panel_account_tokens_account_idx
  ON panel_account_tokens(tenant_id, account_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS panel_account_tokens_expires_idx
  ON panel_account_tokens(expires_at);

ALTER TABLE panel_account_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_account_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS panel_account_tokens_scope ON panel_account_tokens;
CREATE POLICY panel_account_tokens_scope ON panel_account_tokens
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
    OR token_hash = NULLIF(current_setting('app.token_hash', true), '')
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
    OR token_hash = NULLIF(current_setting('app.token_hash', true), '')
  );

DROP POLICY IF EXISTS panel_account_tokens_expired_read ON panel_account_tokens;
CREATE POLICY panel_account_tokens_expired_read ON panel_account_tokens
  FOR SELECT USING (expires_at < now());

DROP POLICY IF EXISTS panel_account_tokens_expired_delete ON panel_account_tokens;
CREATE POLICY panel_account_tokens_expired_delete ON panel_account_tokens
  FOR DELETE USING (expires_at < now());

RESET lock_timeout;
