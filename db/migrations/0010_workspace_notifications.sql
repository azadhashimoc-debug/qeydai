SET lock_timeout = '5s';

-- Persistent notification delivery preferences per workspace member (replaces browser-only localStorage).
CREATE TABLE IF NOT EXISTS sales_notification_prefs (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id) ON DELETE CASCADE,
  member_id text NOT NULL CHECK (length(member_id) BETWEEN 1 AND 128),
  enabled boolean NOT NULL DEFAULT false,
  telegram_chat_id text CHECK (telegram_chat_id IS NULL OR length(telegram_chat_id) BETWEEN 1 AND 64),
  telegram_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT true,
  browser_enabled boolean NOT NULL DEFAULT false,
  reminder_minutes integer NOT NULL DEFAULT 5 CHECK (reminder_minutes IN (5, 15, 30, 60)),
  choices jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(choices) = 'object'),
  email_frequency jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(email_frequency) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, member_id)
);

ALTER TABLE sales_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_notification_prefs FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sales_notification_prefs_isolation ON sales_notification_prefs
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

RESET lock_timeout;
