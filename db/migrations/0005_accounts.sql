-- Email/password accounts. Login looks an account up by email before the tenant is known,
-- so this table is intentionally NOT row-level-secured; only the auth code reads it.
CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
  password_hash text NOT NULL,
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  member_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, member_id) REFERENCES sales_members(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS accounts_tenant_idx ON accounts (tenant_id);
