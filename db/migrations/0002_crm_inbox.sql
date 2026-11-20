-- QeydAI PostgreSQL CRM leads & unified inbox messages schema
-- Target: PostgreSQL 15+
-- Principles: TIMESTAMPTZ, TEXT + CHECK, composite tenant FKs, explicit FK/query indexes, multi-tenant RLS.

SET lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS crm_leads (
  tenant_id  TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 64),
  id         TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  phone      TEXT NOT NULL CHECK (length(phone) BETWEEN 1 AND 64),
  source     TEXT NOT NULL CHECK (source IN ('telegram', 'whatsapp', 'instagram', 'web', 'manual')),
  stage      TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'trial_booked', 'paid', 'lost')),
  note       TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, phone)
);

CREATE INDEX IF NOT EXISTS crm_leads_tenant_updated_idx
  ON crm_leads (tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id         TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 128),
  tenant_id  TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 64),
  lead_id    TEXT NOT NULL CHECK (length(lead_id) BETWEEN 1 AND 128),
  channel    TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'instagram', 'web', 'manual')),
  direction  TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  sender     TEXT NOT NULL CHECK (sender IN ('student', 'ai', 'staff')),
  body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES crm_leads (tenant_id, id) ON DELETE RESTRICT
);

-- Composite FK / thread lookup index and tenant-wide chronological inbox index
CREATE INDEX IF NOT EXISTS inbox_messages_tenant_lead_created_idx
  ON inbox_messages (tenant_id, lead_id, created_at ASC);

CREATE INDEX IF NOT EXISTS inbox_messages_tenant_created_idx
  ON inbox_messages (tenant_id, created_at ASC);

-- Multi-tenant Row-Level Security (optional enforcement when connection sets app.tenant_id; fails closed on empty/unset)
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'crm_leads' AND policyname = 'crm_leads_tenant_isolation'
  ) THEN
    CREATE POLICY crm_leads_tenant_isolation ON crm_leads
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'inbox_messages' AND policyname = 'inbox_messages_tenant_isolation'
  ) THEN
    CREATE POLICY inbox_messages_tenant_isolation ON inbox_messages
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
  END IF;
END $$;

RESET lock_timeout;
