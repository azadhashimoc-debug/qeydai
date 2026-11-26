-- OAuth sign-in: which providers an account may use, and whether it has a usable password.
-- Accounts created by OAuth get password_login_enabled = false (their stored password is random).
-- Linking a provider to an existing password account requires that account's password.
ALTER TABLE panel_accounts
  ADD COLUMN IF NOT EXISTS oauth_providers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS password_login_enabled boolean NOT NULL DEFAULT true;
