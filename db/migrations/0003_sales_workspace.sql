SET lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS sales_workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  locale text NOT NULL DEFAULT 'az' CHECK (locale IN ('az','en')),
  timezone text NOT NULL DEFAULT 'Asia/Baku',
  currency text NOT NULL DEFAULT 'AZN'
);

CREATE TABLE IF NOT EXISTS sales_members (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  role text NOT NULL CHECK (role IN ('owner','manager','operator')),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS sales_member_keys (
  tenant_id text NOT NULL,
  member_id text NOT NULL,
  key_hash text NOT NULL,
  PRIMARY KEY (tenant_id, member_id),
  UNIQUE (key_hash),
  FOREIGN KEY (tenant_id, member_id) REFERENCES sales_members(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_stages (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  position integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('open','won','lost')),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS sales_contacts (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  phone text,
  phone_verified boolean NOT NULL DEFAULT false,
  marketing_opt_in_at timestamptz,
  marketing_opt_out_at timestamptz,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_contacts_phone_uniq ON sales_contacts(tenant_id, phone) NULLS NOT DISTINCT;

CREATE TABLE IF NOT EXISTS sales_phone_matches (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  contact_id text NOT NULL,
  normalized_phone text NOT NULL CHECK (normalized_phone ~ '^\+994(10|50|51|55|60|70|77|99)[0-9]{7}$'),
  channel text NOT NULL CHECK (channel IN ('telegram','whatsapp','instagram','web','manual')),
  sender_id text NOT NULL CHECK (length(sender_id) BETWEEN 1 AND 128),
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, normalized_phone),
  FOREIGN KEY (tenant_id, contact_id) REFERENCES sales_contacts(tenant_id, id)
);
CREATE INDEX sales_phone_matches_unconfirmed_idx ON sales_phone_matches(tenant_id, confirmed, created_at) WHERE confirmed = false;

CREATE TABLE IF NOT EXISTS sales_deals (
  tenant_id text NOT NULL,
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  contact_id text NOT NULL,
  stage_id text NOT NULL,
  assignee_id text,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  source text NOT NULL CHECK (source IN ('telegram','whatsapp','instagram','web','manual')),
  amount_minor bigint NOT NULL DEFAULT 0 CHECK (amount_minor BETWEEN 0 AND 999999999999),
  fields jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(fields) = 'object'),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, contact_id) REFERENCES sales_contacts(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, stage_id) REFERENCES sales_stages(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, assignee_id) REFERENCES sales_members(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales_custom_field_defs (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  kind text NOT NULL CHECK (kind IN ('text','number','date','boolean')),
  required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS sales_deal_field_values (
  tenant_id text NOT NULL,
  deal_id text NOT NULL,
  field_id text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(value) IN ('string','number','boolean') OR jsonb_typeof(value)='null'),
  PRIMARY KEY (tenant_id, deal_id, field_id),
  FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, field_id) REFERENCES sales_custom_field_defs(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_connections (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  channel text NOT NULL CHECK (channel IN ('telegram','whatsapp','instagram')),
  account text NOT NULL CHECK (length(account) BETWEEN 1 AND 128),
  active boolean NOT NULL DEFAULT true,
  automation_enabled boolean NOT NULL DEFAULT false,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (channel, account)
);

CREATE TABLE IF NOT EXISTS sales_threads (
  tenant_id text NOT NULL,
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  connection_id text,
  contact_id text NOT NULL,
  deal_id text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('telegram','whatsapp','instagram','web','manual')),
  sender_id text NOT NULL CHECK (length(sender_id) BETWEEN 1 AND 128),
  mode text NOT NULL DEFAULT 'operator' CHECK (mode IN ('bot','operator')),
  last_inbound_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, connection_id, sender_id),
  FOREIGN KEY (tenant_id, connection_id) REFERENCES sales_connections(tenant_id, id),
  FOREIGN KEY (tenant_id, contact_id) REFERENCES sales_contacts(tenant_id, id),
  FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS sales_messages (
  tenant_id text NOT NULL,
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  thread_id text NOT NULL,
  deal_id text NOT NULL,
  connection_id text,
  provider_event_id text,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  sender text NOT NULL CHECK (sender IN ('student','ai','staff')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  status text NOT NULL CHECK (status IN ('received','queued','sent','delivered','failed','unknown','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, connection_id, provider_event_id),
  FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id),
  FOREIGN KEY (tenant_id, thread_id) REFERENCES sales_threads(tenant_id, id),
  FOREIGN KEY (tenant_id, connection_id) REFERENCES sales_connections(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS sales_outbox (
  tenant_id text NOT NULL,
  message_id text NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  PRIMARY KEY (tenant_id, message_id),
  FOREIGN KEY (tenant_id, message_id) REFERENCES sales_messages(tenant_id, id)
);

CREATE TABLE IF NOT EXISTS sales_activity (
  tenant_id text NOT NULL,
  id bigint GENERATED ALWAYS AS IDENTITY,
  deal_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('stage_changed','note_added','task_created','task_done','contact_updated','booking_linked')),
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_tasks (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  deal_id text NOT NULL,
  assignee_id text,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 10000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','canceled')),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, assignee_id) REFERENCES sales_members(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales_notes (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  id text NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  deal_id text NOT NULL,
  author_id text,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, author_id) REFERENCES sales_members(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales_deal_bookings (
  tenant_id text NOT NULL,
  deal_id text NOT NULL,
  session_id text NOT NULL,
  enrollment_id text NOT NULL,
  PRIMARY KEY (tenant_id, deal_id),
  UNIQUE (tenant_id, enrollment_id),
  FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE
);

-- Idempotent data migration
INSERT INTO sales_workspaces (id, name)
SELECT DISTINCT tenant_id, tenant_id FROM crm_leads
UNION
SELECT DISTINCT tenant_id, tenant_id FROM inbox_messages
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_stages (tenant_id, id, name, position, kind)
SELECT w.id, s.id, s.name, s.position, s.kind
FROM sales_workspaces w
CROSS JOIN (VALUES
  ('new','Yeni',0,'open'),('contacted','Əlaqə saxlanılıb',1,'open'),
  ('trial_booked','Rezervasiya',2,'open'),('paid','Qazanılıb',3,'won'),('lost','İtirilib',4,'lost')
) AS s(id, name, position, kind)
ON CONFLICT (tenant_id, id) DO NOTHING;

INSERT INTO sales_contacts (tenant_id, id, name, phone, phone_verified, created_at)
SELECT tenant_id, id, name, NULLIF(phone, ''), false, created_at FROM crm_leads
ON CONFLICT (tenant_id, id) DO NOTHING;

INSERT INTO sales_deals (tenant_id, id, contact_id, stage_id, title, source, note, created_at, updated_at)
SELECT tenant_id, id, id,
       COALESCE(NULLIF(stage, ''), 'new'),
       name, source, note, created_at, updated_at
FROM crm_leads
ON CONFLICT (tenant_id, id) DO NOTHING;

INSERT INTO sales_threads (tenant_id, id, contact_id, deal_id, channel, sender_id, last_inbound_at)
SELECT tenant_id, lead_id || ':' || channel, lead_id, lead_id, channel, lead_id,
       max(created_at) FILTER (WHERE direction = 'in')
FROM inbox_messages GROUP BY tenant_id, lead_id, channel
ON CONFLICT (tenant_id, id) DO NOTHING;

INSERT INTO sales_messages (tenant_id, id, thread_id, deal_id, direction, sender, body, status, created_at)
SELECT tenant_id, id, lead_id || ':' || channel, lead_id, direction, sender, body,
       CASE direction WHEN 'in' THEN 'received' ELSE 'unknown' END, created_at
FROM inbox_messages
ON CONFLICT (tenant_id, id) DO NOTHING;

-- RLS
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['sales_workspaces','sales_members','sales_member_keys','sales_stages',
    'sales_contacts','sales_phone_matches','sales_deals','sales_custom_field_defs',
    'sales_deal_field_values','sales_connections','sales_threads','sales_messages','sales_outbox',
    'sales_activity','sales_tasks','sales_notes','sales_deal_bookings'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sales_workspaces' AND policyname='sales_workspaces_isolation') THEN
    CREATE POLICY sales_workspaces_isolation ON sales_workspaces
      USING (id = NULLIF(current_setting('app.tenant_id', true), ''))
      WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), ''));
  END IF;

  FOREACH tbl IN ARRAY ARRAY['sales_members','sales_member_keys','sales_stages','sales_contacts',
    'sales_phone_matches','sales_deals','sales_custom_field_defs','sales_deal_field_values',
    'sales_connections','sales_threads','sales_messages','sales_outbox','sales_activity','sales_tasks','sales_notes','sales_deal_bookings'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=tbl AND policyname=tbl || '_isolation') THEN
      EXECUTE format($q$CREATE POLICY %I ON %I USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')) WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))$q$, tbl || '_isolation', tbl);
    END IF;
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS sales_deals_board ON sales_deals(tenant_id, stage_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS sales_deals_contact ON sales_deals(tenant_id, contact_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS sales_deals_assignee ON sales_deals(tenant_id, assignee_id, updated_at DESC) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_messages_history ON sales_messages(tenant_id, thread_id, created_at, id);
CREATE INDEX IF NOT EXISTS sales_messages_deal ON sales_messages(tenant_id, deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sales_activity_deal ON sales_activity(tenant_id, deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sales_tasks_deal_idx ON sales_tasks(tenant_id, deal_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS sales_tasks_assignee_idx ON sales_tasks(tenant_id, assignee_id, due_at) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sales_notes_deal_idx ON sales_notes(tenant_id, deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sales_threads_conn_sender ON sales_threads(tenant_id, connection_id, sender_id);
CREATE INDEX IF NOT EXISTS sales_contacts_phone_idx ON sales_contacts(tenant_id, phone) WHERE phone IS NOT NULL;

RESET lock_timeout;
