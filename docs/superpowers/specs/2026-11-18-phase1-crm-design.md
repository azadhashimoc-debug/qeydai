# QeydAI Phase 1 CRM Design — Multi-tenant Sales Panel

**Date:** 2026-11-18
**Author:** Claude Code (builder check pending)
**Status:** Draft awaiting approval, then plan via superpowers:writing-plans

## Intent and why

QeydAI is a multi-tenant messaging-based sales CRM for Azerbaijan learning centers. Phase 1 replaces the single-tenant lead register with per-business workspaces, server-enforced roles (owner/manager/operator), Contacts, Deals (satış fürsəti), Conversations (söhbēt), Kanban board, custom fields, tasks, notes, search/filters, unified deal timeline, and migration of existing leads into a default sales board preserving message history. Phone-based contact matching with unconfirmed-match prompt for operators.

Users asked to make the architectural decision and start Phase 1 after checking studio/skills/agents. No clarifying questions (opted out).

## Scope (Phase 1)

- Per-business workspaces (sales_workspaces)
- Roles owner / manager / operator with workspace isolation
- Contacts (phone-based matching, phone_verified flag, unconfirmed phone-match table)
- Deals (stage, assignee, amount AZN as amount_minor, custom fields, note)
- Conversations / threads / messages per deal
- Tasks and notes per deal
- Custom field definitions + deal field values
- Kanban board + list view + contact/deal detail + team & stage management
- Migrate existing crm_leads/inbox_messages into default sales board preserving history
- Unified deal timeline (messages + stage changes + notes + bookings)
- Outbox delivery worker remains; webhooks remain
- SQLite + Postgres store parity for dev/tests/CI/E2E

## Non-goals

- Multi-channel outbound beyond existing outbox worker
- AI routing changes
- Payments/billing
- Member password login (admin key + panel cookie auth continues)

## Constraints

- Node 24 built-in node:sqlite for dev/tests/CI/E2E (ENROLL_DB_FILE)
- PostgreSQL 15+ for production (QEYDAI_DATABASE_URL), TIMESTAMPTZ, TEXT+CHECK, JSONB, TEXT[], RLS app.tenant_id
- HMAC-SHA256 HttpOnly SameSite=Lax cookie (qeydai_panel), sameOrigin CSRF on mutations, readLimitedUtf8, rate limiting, fail-closed QEYDAI_API_KEYS/QEYDAI_ADMIN_KEYS, noStoreHeaders
- AGENTS.md: read node_modules/next/dist/docs/ before writing Next.js code
- CAVEMAN MODE (full): terse responses; technical terms exact

## Existing state that Phase 1 touches

- db/migrations/0003_sales_workspace.sql — exists, untracked, to be rewritten in place
- db/migrations/0001_init.sql, 0002_crm_inbox.sql — shipped, do not touch
- src/lib/crm/store.ts — Postgres workspaceTransaction/initializeWorkspace/ingestMessage (Bug: sales_messages insert uses 6 placeholders for 7 bound params; provider_event_id placeholder missing)
- src/app/api/panel/sales/route.ts — prototype GET/POST /api/panel/sales with actions stage/move/reply/details; queries m.deal_id (column exists in 0003 but placeholder mismatch in store breaks ingest)
- src/lib/enrollment/sqlite-store.ts — covers sessions/enrollments/crm_leads/inbox_messages only; no sales_* parity
- src/components/panel/ — LeadsTab, InboxTab, OverviewTab, PanelShell, LoginGate, types.ts
- tests/e2e/panel.spec.ts — 48 E2E tests against /api/panel/* and /api/v1/*
- src/lib/api/panel-api.test.ts — unit tests for panel API

## Gaps fixed by Phase 1 (from database-architect review of 0003)

1. sales_messages insert placeholder mismatch: 6 $n placeholders for 7 bound parameters (provider_event_id placeholder missing) — fix in store.ts
2. RLS policies lack NULLIF(current_setting('app.tenant_id', true), '') fail-closed form used in 0002
3. No FORCE ROW LEVEL SECURITY
4. Missing tables: sales_tasks, sales_notes, sales_custom_field_defs, sales_deal_field_values, sales_phone_matches, sales_deal_bookings, sales_member_keys
5. Missing phone_verified column on sales_contacts
6. Missing FK indexes
7. Data migration idempotency (ON CONFLICT ... DO NOTHING), tenants only in inbox_messages get no workspace
8. No member_id resolution from panel session (admin-key fingerprint → sales_member_keys.key_hash → member_id → role)

## New schema (rewrite 0003)

```sql
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
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, phone) NULLS NOT DISTINCT
);

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
SELECT tenant_id, id, id, stage, name, source, note, created_at, updated_at FROM crm_leads
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
      EXECUTE format('CREATE POLICY %I ON %I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '')) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), ''))', tbl || '_isolation', tbl);
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
```

## SQLite parity (sqlite-store.ts)

Add sales_* tables with same columns/constraints:
- timestamptz → ISO8601 TEXT; now() defaults → CURRENT_TIMESTAMP storing ISO text matching now().toISOString()
- jsonb → TEXT; app-side validation
- No RLS: every query scoped by tenant_id; tests assert cross-tenant isolation at store layer
- Tables: sales_workspaces, sales_members, sales_member_keys, sales_stages, sales_contacts (+phone_verified), sales_phone_matches, sales_deals, sales_custom_field_defs, sales_deal_field_values, sales_connections, sales_threads, sales_messages, sales_outbox, sales_activity, sales_tasks, sales_notes, sales_deal_bookings
- initializeWorkspace seeds default stages per tenant idempotently

## Auth / principal resolution

Panel session cookie (qeydai_panel) → verifyPanelSessionToken → tenantId + key fingerprint k → sales_member_keys.key_hash → member_id → sales_members.role.

- QEYDAI_ADMIN_KEYS env keys: owner role (env-role), key_hash registered under tenant's owner member
- QEYDAI_PANEL_KEYS env members (key → {tenant, role}): manager/operator, key_hash registered
- DB sales_member_keys for runtime member key management (future)
- If no member mapping → 403 (fail closed)

## RBAC matrix

| Action | Owner | Manager | Operator |
|--------|-------|---------|----------|
| Read own workspace deals/contacts/messages | ✅ | ✅ | ✅ (assigned deals only; unassigned read-only) |
| Create/update/delete deals | ✅ | ✅ | ✅ only assigned deals |
| Move deal stage | ✅ | ✅ | ✅ assigned deals |
| Create stages / custom fields / members | ✅ | ✅ | ❌ |
| Reply to conversation | ✅ | ✅ | ✅ assigned deal threads |
| Create tasks/notes | ✅ | ✅ | ✅ assigned deals |
| Claim unassigned deal | — | ✅ | ✅ atomic /claim |
| View all members | ✅ | ✅ | ❌ (own card only) |
| Cross-tenant access | ❌ | ❌ | ❌ |

Operator queue: assigned-only write + read-only unassigned; atomic /claim flips assignee_id from NULL to member_id with WHERE assignee_id IS NULL (row-level, one winner).

## API contracts (/api/panel/*)

All routes: cookie auth via requirePanelSession, sameOrigin CSRF on POST/PATCH/DELETE, rate limiting, MAX_CRM_BODY_BYTES=16384, tenant enforced by RLS + app scope.

- GET /api/panel/overview — KPI cards, pipeline, sessions
- GET/POST /api/panel/sessions — trial sessions
- POST /api/panel/sessions/:id — update/delete session
- GET /api/panel/leads — list leads with stage/source/q filters (backward compatible)
- POST /api/panel/leads — create lead
- PATCH /api/panel/leads/:id — update stage/note
- GET /api/panel/contacts — list contacts
- POST /api/panel/contacts — create/update contact
- GET /api/panel/deals — list deals (kanban board data): id, contact, stage, assignee, amount, title, updated_at
- PATCH /api/panel/deals/:id — update title/note/amount/stage/assignee
- POST /api/panel/deals/:id/claim — atomic claim for operator
- GET /api/panel/deals/:id/messages — conversation history
- POST /api/panel/deals/:id/messages — staff reply → outbox queued
- GET /api/panel/deals/:id/timeline — unified timeline: messages, stage changes, notes, tasks, bookings
- POST /api/panel/tasks — create task; PATCH/DELETE /api/panel/tasks/:id
- POST /api/panel/notes — create note; DELETE /api/panel/notes/:id
- GET/POST/PATCH/DELETE /api/panel/stages — stage CRUD
- GET/POST/PATCH/DELETE /api/panel/custom-fields — field def CRUD
- GET/PATCH /api/panel/deals/:id/fields — field values
- GET /api/panel/members — list members; POST /api/panel/members — add member
- GET /api/panel/phone-matches — unconfirmed phone matches; POST /api/panel/phone-matches/:id/confirm — confirm match
- POST /api/panel/workspace — workspace settings (locale, timezone, currency)
- GET /api/panel/auth (GET/POST/DELETE) — existing session auth

Existing /api/v1/* (enroll-api) unchanged, backward compatible.

## store.ts fixes

1. Fix sales_messages insert: 7 placeholders for 7 bound params (add provider_event_id placeholder).
2. ingestMessage: after contact upsert, check sales_phone_matches unconfirmed for normalized phone; if none confirmed, insert unconfirmed match and flag contact for operator review.
3. add tenant-scoped queries for new tables (tasks, notes, fields, phone matches, members).

## UI components (panel/)

- KanbanBoard: columns = open stages; cards = deals; drag to move stage (optimistic + PATCH move)
- DealList: table + search/stage/source/assignee filters
- ContactDetail: contact info, linked deals, phone match confirmation banner if unconfirmed
- DealDetail: timeline (messages + activity), amount, custom fields, tasks, notes
- TeamStageTab: members list, role management (owner/manager), stage editor
- InboxTab extended: unconfirmed phone match review panel

## i18n

Add panel keys to en.json / az.json:
- tasks, notes, custom fields, members, phone match, claim, timeline, amount AZN
- stage names already present

## Testing

- Unit: panel-api.test.ts extended for new routes, RBAC, rate limiting, CSRF
- sqlite-store tests for sales_* parity
- E2E: tests/e2e/panel.spec.ts extended: Kanban move, operator claim, contact create, phone match confirm, role isolation, cross-tenant 404
- api-security-audit agent review before build

## Verification gates

- npm test (vitest)
- npm run lint
- npx tsc --noEmit
- npm run build
- npm run e2e
- api-security-audit
- Restart demo server after build; port 3000 CSS 200 check

## Builder check

Dispatch builder-check subagent with this doc before superpowers:writing-plans.
