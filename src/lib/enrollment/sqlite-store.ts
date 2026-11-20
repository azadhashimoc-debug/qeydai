import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { InboundMessage } from "../crm/channels";
import type {
  CreateSessionOutcome,
  CrmLead,
  Enrollment,
  EnrollmentStore,
  InboxMessage,
  InsertOutcome,
  LeadSource,
  LeadStage,
  MessageDirection,
  MessageSender,
  Session,
  SessionSummary,
} from "./enrollment";

const MAX_INBOX_MESSAGES = 500;

type SessionRow = { id: string; tenant_id: string; course_id: string; starts_at: string; capacity: number };
type SessionSummaryRow = SessionRow & { taken: number };
type EnrollmentRow = { id: string; tenant_id: string; session_id: string; name: string; phone: string; created_at: string };
type CrmLeadRow = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  note: string;
  created_at: string;
  updated_at: string;
};
type InboxMessageRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  channel: LeadSource;
  direction: MessageDirection;
  sender: MessageSender;
  body: string;
  created_at: string;
};

type SalesStageRow = { id: string; tenant_id: string; name: string; position: number; kind: string };
type SalesContactRow = { id: string; tenant_id: string; name: string; phone: string | null; phone_verified: number; tags: string; created_at: string };

export type PageOpts = { limit?: number; offset?: number };
const MAX_PAGE_SIZE = 500;

function pageParams(opts?: PageOpts): [number, number] {
  const limit = opts?.limit !== undefined ? Math.min(Math.max(0, Number(opts.limit)), MAX_PAGE_SIZE) : MAX_PAGE_SIZE;
  const offset = opts?.offset !== undefined ? Math.max(0, Number(opts.offset)) : 0;
  return [limit, offset];
}
type SalesDealCamelRow = { id: string; contactId: string; stageId: string; assigneeId: string | null; title: string; source: string; amountMinor: number; fields: string | null; note: string; createdAt: string; updatedAt: string; contactName?: string; contactPhone?: string | null; stageName?: string; stageKind?: string };
type SalesTaskCamelRow = { id: string; dealId: string; assigneeId: string | null; title: string; body: string; status: "open" | "done" | "canceled"; dueAt: string | null; createdAt: string; updatedAt: string };
type SalesNoteCamelRow = { id: string; dealId: string; authorId: string | null; body: string; createdAt: string };
type SalesFieldDefRow = { id: string; tenant_id: string; name: string; kind: string; required: number; position: number };
type SalesFieldValueRow = { tenant_id: string; deal_id: string; field_id: string; value: string };
type SalesMemberRow = { id: string; tenant_id: string; name: string; role: string };
type SalesPhoneMatchCamelRow = { id: string; contactId: string; normalizedPhone: string; channel: string; senderId: string; confirmed: number; createdAt: string };
type SalesWorkspaceRow = { id: string; name: string; locale: string; timezone: string; currency: string };

/**
 * Durable EnrollmentStore on node:sqlite (built into Node 24, no native add-on).
 *
 * Atomicity: insertIfAvailable runs in BEGIN IMMEDIATE, which takes the write lock before the
 * capacity read, so two connections (or processes) cannot both take the last seat.
 * Duplicates are also enforced by UNIQUE(tenant_id, session_id, phone), independent of service code.
 * Every query is scoped by tenant_id; ids are stored in separate columns (no "tenant:id" string keys).
 *
 * Migration note: the same schema maps 1:1 to PostgreSQL; use SELECT ... FOR UPDATE on the session
 * row in place of BEGIN IMMEDIATE.
 */
export class SqliteEnrollmentStore implements EnrollmentStore {
  private db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA busy_timeout = 10000");
    if (file !== ":memory:") this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        tenant_id TEXT NOT NULL,
        id        TEXT NOT NULL,
        course_id TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        capacity  INTEGER NOT NULL CHECK (capacity >= 0),
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE IF NOT EXISTS enrollments (
        id         TEXT PRIMARY KEY,
        tenant_id  TEXT NOT NULL,
        session_id TEXT NOT NULL,
        name       TEXT NOT NULL,
        phone      TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (tenant_id, session_id, phone),
        FOREIGN KEY (tenant_id, session_id) REFERENCES sessions (tenant_id, id)
      );
      CREATE INDEX IF NOT EXISTS enrollments_tenant_session_idx
        ON enrollments (tenant_id, session_id);
      CREATE INDEX IF NOT EXISTS enrollments_tenant_created_idx
        ON enrollments (tenant_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS crm_leads (
        tenant_id  TEXT NOT NULL,
        id         TEXT NOT NULL,
        name       TEXT NOT NULL,
        phone      TEXT NOT NULL,
        source     TEXT NOT NULL CHECK (source IN ('telegram', 'whatsapp', 'instagram', 'web', 'manual')),
        stage      TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'trial_booked', 'paid', 'lost')),
        note       TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (tenant_id, id),
        UNIQUE (tenant_id, phone)
      );
      CREATE INDEX IF NOT EXISTS crm_leads_tenant_updated_idx
        ON crm_leads (tenant_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS inbox_messages (
        id         TEXT PRIMARY KEY,
        tenant_id  TEXT NOT NULL,
        lead_id    TEXT NOT NULL,
        channel    TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'instagram', 'web', 'manual')),
        direction  TEXT NOT NULL CHECK (direction IN ('in', 'out')),
        sender     TEXT NOT NULL CHECK (sender IN ('student', 'ai', 'staff')),
        body       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id, lead_id) REFERENCES crm_leads (tenant_id, id)
      );
      CREATE INDEX IF NOT EXISTS inbox_messages_tenant_lead_created_idx
        ON inbox_messages (tenant_id, lead_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS inbox_messages_tenant_created_idx
        ON inbox_messages (tenant_id, created_at ASC);

      CREATE TABLE IF NOT EXISTS sales_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        locale TEXT NOT NULL DEFAULT 'az' CHECK (locale IN ('az','en')),
        timezone TEXT NOT NULL DEFAULT 'Asia/Baku',
        currency TEXT NOT NULL DEFAULT 'AZN'
      );
      CREATE TABLE IF NOT EXISTS sales_members (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        role TEXT NOT NULL CHECK (role IN ('owner','manager','operator')),
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE IF NOT EXISTS sales_member_keys (
        tenant_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        PRIMARY KEY (tenant_id, member_id),
        UNIQUE (key_hash),
        FOREIGN KEY (tenant_id, member_id) REFERENCES sales_members(tenant_id, id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sales_stages (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
        position INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('open','won','lost')),
        PRIMARY KEY (tenant_id, id)
      );
      CREATE TABLE IF NOT EXISTS sales_contacts (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
        phone TEXT,
        phone_verified INTEGER NOT NULL DEFAULT 0,
        marketing_opt_in_at TEXT,
        marketing_opt_out_at TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tenant_id, id),
        UNIQUE (tenant_id, phone)
      );
      CREATE TABLE IF NOT EXISTS sales_phone_matches (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        contact_id TEXT NOT NULL,
        normalized_phone TEXT NOT NULL CHECK (normalized_phone GLOB '+994[1-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
        channel TEXT NOT NULL CHECK (channel IN ('telegram','whatsapp','instagram','web','manual')),
        sender_id TEXT NOT NULL CHECK (length(sender_id) BETWEEN 1 AND 128),
        confirmed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tenant_id, id),
        UNIQUE (tenant_id, normalized_phone),
        FOREIGN KEY (tenant_id, contact_id) REFERENCES sales_contacts(tenant_id, id)
      );
      CREATE INDEX IF NOT EXISTS sales_phone_matches_unconfirmed_idx
        ON sales_phone_matches(tenant_id, confirmed, created_at) WHERE confirmed = 0;
      CREATE TABLE IF NOT EXISTS sales_deals (
        tenant_id TEXT NOT NULL,
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        contact_id TEXT NOT NULL,
        stage_id TEXT NOT NULL,
        assignee_id TEXT,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
        source TEXT NOT NULL CHECK (source IN ('telegram','whatsapp','instagram','web','manual')),
        amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor BETWEEN 0 AND 999999999999),
        fields TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(fields) AND json_type(fields) = 'object'),
        note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 10000),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id, contact_id) REFERENCES sales_contacts(tenant_id, id) ON DELETE RESTRICT,
        FOREIGN KEY (tenant_id, stage_id) REFERENCES sales_stages(tenant_id, id) ON DELETE RESTRICT,
        FOREIGN KEY (tenant_id, assignee_id) REFERENCES sales_members(tenant_id, id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS sales_custom_field_defs (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
        kind TEXT NOT NULL CHECK (kind IN ('text','number','date','boolean')),
        required INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, id),
        UNIQUE (tenant_id, name)
      );
      CREATE TABLE IF NOT EXISTS sales_deal_field_values (
        tenant_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        field_id TEXT NOT NULL,
        value TEXT NOT NULL DEFAULT '{}',
        PRIMARY KEY (tenant_id, deal_id, field_id),
        FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id, field_id) REFERENCES sales_custom_field_defs(tenant_id, id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sales_connections (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        channel TEXT NOT NULL CHECK (channel IN ('telegram','whatsapp','instagram')),
        account TEXT NOT NULL CHECK (length(account) BETWEEN 1 AND 128),
        active INTEGER NOT NULL DEFAULT 1,
        automation_enabled INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, id),
        UNIQUE (channel, account)
      );
      CREATE TABLE IF NOT EXISTS sales_threads (
        tenant_id TEXT NOT NULL,
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        connection_id TEXT,
        contact_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        channel TEXT NOT NULL CHECK (channel IN ('telegram','whatsapp','instagram','web','manual')),
        sender_id TEXT NOT NULL CHECK (length(sender_id) BETWEEN 1 AND 128),
        mode TEXT NOT NULL DEFAULT 'operator' CHECK (mode IN ('bot','operator')),
        last_inbound_at TEXT,
        PRIMARY KEY (tenant_id, id),
        UNIQUE (tenant_id, connection_id, sender_id),
        FOREIGN KEY (tenant_id, connection_id) REFERENCES sales_connections(tenant_id, id),
        FOREIGN KEY (tenant_id, contact_id) REFERENCES sales_contacts(tenant_id, id),
        FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id)
      );
      CREATE TABLE IF NOT EXISTS sales_messages (
        tenant_id TEXT NOT NULL,
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        thread_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        connection_id TEXT,
        provider_event_id TEXT,
        direction TEXT NOT NULL CHECK (direction IN ('in','out')),
        sender TEXT NOT NULL CHECK (sender IN ('student','ai','staff')),
        body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
        status TEXT NOT NULL CHECK (status IN ('received','queued','sent','delivered','failed','unknown','canceled')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tenant_id, id),
        UNIQUE (tenant_id, connection_id, provider_event_id),
        FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id),
        FOREIGN KEY (tenant_id, thread_id) REFERENCES sales_threads(tenant_id, id),
        FOREIGN KEY (tenant_id, connection_id) REFERENCES sales_connections(tenant_id, id)
      );
      CREATE TABLE IF NOT EXISTS sales_outbox (
        tenant_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        available_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lease_until TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        PRIMARY KEY (tenant_id, message_id),
        FOREIGN KEY (tenant_id, message_id) REFERENCES sales_messages(tenant_id, id)
      );
      CREATE TABLE IF NOT EXISTS sales_activity (
        tenant_id TEXT NOT NULL,
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        deal_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('stage_changed','note_added','task_created','task_done','contact_updated','booking_linked')),
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sales_tasks (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        deal_id TEXT NOT NULL,
        assignee_id TEXT,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
        body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 10000),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','canceled')),
        due_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id, assignee_id) REFERENCES sales_members(tenant_id, id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS sales_notes (
        tenant_id TEXT NOT NULL REFERENCES sales_workspaces(id),
        id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
        deal_id TEXT NOT NULL,
        author_id TEXT,
        body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tenant_id, id),
        FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id, author_id) REFERENCES sales_members(tenant_id, id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS sales_deal_bookings (
        tenant_id TEXT NOT NULL,
        deal_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        enrollment_id TEXT NOT NULL,
        PRIMARY KEY (tenant_id, deal_id),
        UNIQUE (tenant_id, enrollment_id),
        FOREIGN KEY (tenant_id, deal_id) REFERENCES sales_deals(tenant_id, id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS panel_revoked_jti (
        jti TEXT PRIMARY KEY,
        exp_ms INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS panel_revoked_jti_exp_idx ON panel_revoked_jti(exp_ms);
    `);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.initializeWorkspaceSqlite();
  }

  private initializeWorkspaceSqlite() {
    this.initializeSalesWorkspace("default");
  }

  initializeSalesWorkspace(tenantId: string) {
    this.db.prepare("INSERT OR IGNORE INTO sales_workspaces (id, name) VALUES (?, ?)").run(tenantId, tenantId);
    for (const [id, name, position, kind] of [
      ["new", "New", 0, "open"],
      ["contacted", "Contacted", 1, "open"],
      ["trial_booked", "Booked", 2, "open"],
      ["paid", "Won", 3, "won"],
      ["lost", "Lost", 4, "lost"],
    ]) {
      this.db
        .prepare("INSERT OR IGNORE INTO sales_stages (tenant_id,id,name,position,kind) VALUES (?,?,?,?,?)")
        .run(tenantId, id, name, position, kind);
    }
  }

  // ---- panel JTI revocation (persistent, cross-worker) ----

  async revokePanelJti(jti: string, expMs: number): Promise<void> {
    this.db.prepare("INSERT OR REPLACE INTO panel_revoked_jti (jti, exp_ms) VALUES (?, ?)").run(jti, expMs);
  }

  async isPanelJtiRevoked(jti: string, nowMs: number): Promise<boolean> {
    const row = this.db.prepare("SELECT exp_ms FROM panel_revoked_jti WHERE jti = ?").get(jti) as
      | { exp_ms: number }
      | undefined;
    if (!row) return false;
    if (row.exp_ms <= nowMs) {
      this.db.prepare("DELETE FROM panel_revoked_jti WHERE jti = ?").run(jti);
      return false;
    }
    return true;
  }

  async purgeExpiredPanelJtis(nowMs: number): Promise<void> {
    this.db.prepare("DELETE FROM panel_revoked_jti WHERE exp_ms <= ?").run(nowMs);
  }

  close() {
    this.db.close();
  }

  getSqliteDb() {
    return this.db;
  }

  addSession(s: Session) {
    this.db
      .prepare("INSERT OR REPLACE INTO sessions (tenant_id, id, course_id, starts_at, capacity) VALUES (?, ?, ?, ?, ?)")
      .run(s.tenantId, s.id, s.courseId, s.startsAt, s.capacity);
  }

  async createSession(s: Session): Promise<CreateSessionOutcome> {
    const r = this.db
      .prepare("INSERT OR IGNORE INTO sessions (tenant_id, id, course_id, starts_at, capacity) VALUES (?, ?, ?, ?, ?)")
      .run(s.tenantId, s.id, s.courseId, s.startsAt, s.capacity);
    return Number(r.changes) === 1 ? "created" : "exists";
  }

  private toSession(r: SessionRow): Session {
    return { id: r.id, tenantId: r.tenant_id, courseId: r.course_id, startsAt: r.starts_at, capacity: r.capacity };
  }

  private toEnrollment(r: EnrollmentRow): Enrollment {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      sessionId: r.session_id,
      name: r.name,
      phone: r.phone,
      createdAt: r.created_at,
    };
  }

  private toLead(r: CrmLeadRow): CrmLead {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      phone: r.phone,
      source: r.source,
      stage: r.stage,
      note: r.note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private toMessage(r: InboxMessageRow): InboxMessage {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      leadId: r.lead_id,
      channel: r.channel,
      direction: r.direction,
      sender: r.sender,
      body: r.body,
      createdAt: r.created_at,
    };
  }

  async getSession(tenantId: string, sessionId: string) {
    const r = this.db.prepare("SELECT * FROM sessions WHERE tenant_id = ? AND id = ?").get(tenantId, sessionId) as
      | SessionRow
      | undefined;
    return r ? this.toSession(r) : null;
  }

  async listSessions(tenantId: string) {
    const rows = this.db.prepare("SELECT * FROM sessions WHERE tenant_id = ? ORDER BY starts_at").all(tenantId) as SessionRow[];
    return rows.map((r) => this.toSession(r));
  }

  async countBySession(tenantId: string, sessionId: string) {
    const r = this.db
      .prepare("SELECT COUNT(*) AS n FROM enrollments WHERE tenant_id = ? AND session_id = ?")
      .get(tenantId, sessionId) as { n: number };
    return Number(r.n);
  }

  async countBySessions(tenantId: string, sessionIds: string[]) {
    const counts = new Map<string, number>();
    if (sessionIds.length === 0) return counts;
    for (const id of sessionIds) counts.set(id, 0);
    const rows = this.db
      .prepare("SELECT session_id, COUNT(*) AS n FROM enrollments WHERE tenant_id = ? GROUP BY session_id")
      .all(tenantId) as Array<{ session_id: string; n: number }>;
    for (const r of rows) {
      if (counts.has(r.session_id)) counts.set(r.session_id, Number(r.n));
    }
    return counts;
  }

  async insertIfAvailable(e: Enrollment): Promise<InsertOutcome> {
    let sp: string | null = null;
    try {
      this.db.exec("BEGIN IMMEDIATE");
    } catch (beginErr) {
      if (beginErr instanceof Error && /within a transaction/i.test(beginErr.message)) {
        sp = `sp_enr_${randomUUID().replace(/-/g, "")}`;
        this.db.exec(`SAVEPOINT ${sp}`);
      } else {
        throw beginErr;
      }
    }
    const commitTx = () => {
      if (sp) {
        this.db.exec(`RELEASE SAVEPOINT ${sp}`);
      } else {
        this.db.exec("COMMIT");
      }
    };
    const rollbackTx = () => {
      if (sp) {
        this.db.exec(`ROLLBACK TO SAVEPOINT ${sp}`);
        this.db.exec(`RELEASE SAVEPOINT ${sp}`);
      } else {
        this.db.exec("ROLLBACK");
      }
    };
    try {
      const s = this.db.prepare("SELECT capacity FROM sessions WHERE tenant_id = ? AND id = ?").get(e.tenantId, e.sessionId) as
        | { capacity: number }
        | undefined;
      if (!s) {
        rollbackTx();
        return "unknown_session";
      }
      const dup = this.db
        .prepare("SELECT 1 AS x FROM enrollments WHERE tenant_id = ? AND session_id = ? AND phone = ?")
        .get(e.tenantId, e.sessionId, e.phone);
      if (dup) {
        rollbackTx();
        return "duplicate";
      }
      const n = this.db
        .prepare("SELECT COUNT(*) AS n FROM enrollments WHERE tenant_id = ? AND session_id = ?")
        .get(e.tenantId, e.sessionId) as { n: number };
      if (Number(n.n) >= s.capacity) {
        rollbackTx();
        return "full";
      }
      this.db
        .prepare("INSERT INTO enrollments (id, tenant_id, session_id, name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(e.id, e.tenantId, e.sessionId, e.name, e.phone, e.createdAt);
      commitTx();
      return "inserted";
    } catch (err) {
      try {
        rollbackTx();
      } catch {
        /* transaction already closed */
      }
      if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) return "duplicate";
      throw err;
    }
  }

  async listEnrollments(tenantId: string, sessionId?: string): Promise<Enrollment[]> {
    const rows = (
      sessionId === undefined
        ? this.db
            .prepare(
              "SELECT id, tenant_id, session_id, name, phone, created_at FROM enrollments WHERE tenant_id = ? ORDER BY created_at DESC",
            )
            .all(tenantId)
        : this.db
            .prepare(
              "SELECT id, tenant_id, session_id, name, phone, created_at FROM enrollments WHERE tenant_id = ? AND session_id = ? ORDER BY created_at DESC",
            )
            .all(tenantId, sessionId)
    ) as EnrollmentRow[];
    return rows.map((r) => this.toEnrollment(r));
  }

  async listSessionsWithCounts(tenantId: string): Promise<SessionSummary[]> {
    const rows = this.db
      .prepare(
        `SELECT s.id, s.tenant_id, s.course_id, s.starts_at, s.capacity, COUNT(e.id) AS taken
         FROM sessions s
         LEFT JOIN enrollments e ON e.tenant_id = s.tenant_id AND e.session_id = s.id
         WHERE s.tenant_id = ?
         GROUP BY s.tenant_id, s.id, s.course_id, s.starts_at, s.capacity
         ORDER BY s.starts_at ASC`,
      )
      .all(tenantId) as SessionSummaryRow[];
    return rows.map((r) => {
      const taken = Number(r.taken);
      return {
        session: this.toSession(r),
        taken,
        seatsLeft: Math.max(0, r.capacity - taken),
      };
    });
  }

  async upsertLead(lead: {
    id: string;
    tenantId: string;
    name: string;
    phone: string;
    source: LeadSource;
    stage?: LeadStage;
    note?: string;
    nowIso: string;
  }): Promise<CrmLead> {
    const row = this.db
      .prepare(
        `INSERT INTO crm_leads (id, tenant_id, name, phone, source, stage, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (tenant_id, phone) DO UPDATE SET
           name = excluded.name,
           source = excluded.source,
           stage = COALESCE(?, crm_leads.stage),
           note = CASE
             WHEN excluded.note = '' THEN crm_leads.note
             WHEN crm_leads.note = '' THEN excluded.note
             ELSE substr(crm_leads.note || char(10) || excluded.note, 1, 10000)
           END,
           updated_at = excluded.updated_at
         RETURNING id, tenant_id, name, phone, source, stage, note, created_at, updated_at`,
      )
      .get(
        lead.id,
        lead.tenantId,
        lead.name,
        lead.phone,
        lead.source,
        lead.stage ?? "new",
        lead.note ?? "",
        lead.nowIso,
        lead.nowIso,
        lead.stage ?? null,
      ) as CrmLeadRow;
    return this.toLead(row);
  }

  async listLeads(tenantId: string): Promise<CrmLead[]> {
    const rows = this.db
      .prepare(
        "SELECT id, tenant_id, name, phone, source, stage, note, created_at, updated_at FROM crm_leads WHERE tenant_id = ? ORDER BY updated_at DESC",
      )
      .all(tenantId) as CrmLeadRow[];
    return rows.map((r) => this.toLead(r));
  }

  async getLead(tenantId: string, leadId: string): Promise<CrmLead | null> {
    const row = this.db
      .prepare(
        "SELECT id, tenant_id, name, phone, source, stage, note, created_at, updated_at FROM crm_leads WHERE tenant_id = ? AND id = ?",
      )
      .get(tenantId, leadId) as CrmLeadRow | undefined;
    return row ? this.toLead(row) : null;
  }

  async updateLead(
    tenantId: string,
    leadId: string,
    patch: { stage?: LeadStage; note?: string; updatedAt: string },
  ): Promise<CrmLead | null> {
    const row = this.db
      .prepare(
        `UPDATE crm_leads
         SET stage = COALESCE(?, stage),
             note = COALESCE(?, note),
             updated_at = ?
         WHERE tenant_id = ? AND id = ?
         RETURNING id, tenant_id, name, phone, source, stage, note, created_at, updated_at`,
      )
      .get(patch.stage ?? null, patch.note ?? null, patch.updatedAt, tenantId, leadId) as CrmLeadRow | undefined;
    return row ? this.toLead(row) : null;
  }

  async addMessage(msg: InboxMessage): Promise<InboxMessage | null> {
    try {
      const row = this.db
        .prepare(
          `INSERT INTO inbox_messages (id, tenant_id, lead_id, channel, direction, sender, body, created_at)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM crm_leads WHERE tenant_id = ? AND id = ?)
           RETURNING id, tenant_id, lead_id, channel, direction, sender, body, created_at`,
        )
        .get(
          msg.id,
          msg.tenantId,
          msg.leadId,
          msg.channel,
          msg.direction,
          msg.sender,
          msg.body,
          msg.createdAt,
          msg.tenantId,
          msg.leadId,
        ) as InboxMessageRow | undefined;
      return row ? this.toMessage(row) : null;
    } catch (err) {
      if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) return null;
      throw err;
    }
  }

  async listMessages(tenantId: string, leadId?: string): Promise<InboxMessage[]> {
    const rows = (
      leadId === undefined
        ? this.db
            .prepare(
              `SELECT id, tenant_id, lead_id, channel, direction, sender, body, created_at
               FROM inbox_messages
               WHERE tenant_id = ?
               ORDER BY created_at ASC
               LIMIT ?`,
            )
            .all(tenantId, MAX_INBOX_MESSAGES)
        : this.db
            .prepare(
              `SELECT id, tenant_id, lead_id, channel, direction, sender, body, created_at
               FROM inbox_messages
               WHERE tenant_id = ? AND lead_id = ?
               ORDER BY created_at ASC
               LIMIT ?`,
            )
            .all(tenantId, leadId, MAX_INBOX_MESSAGES)
    ) as InboxMessageRow[];
    return rows.map((r) => this.toMessage(r));
  }

  // ---- sales workspaces ----

  async requireSalesMember(tenantId: string, memberId: string | null): Promise<{ memberId: string; role: "owner" | "manager" | "operator" } | null> {
    if (!memberId) return null;
    const r = this.db
      .prepare("SELECT id, role FROM sales_members WHERE tenant_id = ? AND id = ?")
      .get(tenantId, memberId) as { id: string; role: "owner" | "manager" | "operator" } | undefined;
    if (!r) return null;
    return { memberId: r.id, role: r.role };
  }

  async listSalesStages(tenantId: string): Promise<{ id: string; name: string; position: number; kind: "open" | "won" | "lost" }[]> {
    const rows = this.db
      .prepare("SELECT id, name, position, kind FROM sales_stages WHERE tenant_id = ? ORDER BY position, id")
      .all(tenantId) as SalesStageRow[];
    return rows.map((r) => ({ id: r.id, name: r.name, position: r.position, kind: r.kind as "open" | "won" | "lost" }));
  }

  async createSalesStage(tenantId: string, name: string): Promise<{ id: string; name: string; position: number; kind: "open" | "won" | "lost" } | null> {
    const maxPos = this.db
      .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM sales_stages WHERE tenant_id = ?")
      .get(tenantId) as { m: number };
    const id = randomUUID();
    const r = this.db
      .prepare(
        `INSERT INTO sales_stages (tenant_id, id, name, position, kind) VALUES (?, ?, ?, ?, 'open')
         RETURNING id, name, position, kind`,
      )
      .get(tenantId, id, name, Number(maxPos.m) + 1) as SalesStageRow | undefined;
    return r ? { id: r.id, name: r.name, position: r.position, kind: r.kind as "open" | "won" | "lost" } : null;
  }

  async updateSalesStage(tenantId: string, id: string, name: string): Promise<boolean> {
    const r = this.db.prepare("UPDATE sales_stages SET name = ? WHERE tenant_id = ? AND id = ? AND kind = 'open'").run(name, tenantId, id);
    return r.changes > 0;
  }

  async deleteSalesStage(tenantId: string, id: string): Promise<boolean> {
    const used = this.db.prepare("SELECT 1 FROM sales_deals WHERE tenant_id = ? AND stage_id = ? LIMIT 1").get(tenantId, id);
    if (used) return false;
    const r = this.db.prepare("DELETE FROM sales_stages WHERE tenant_id = ? AND id = ? AND kind = 'open'").run(tenantId, id);
    return r.changes > 0;
  }

  // ---- deals ----

  async listSalesDeals(tenantId: string): Promise<{ id: string; contactId: string; stageId: string; assigneeId: string | null; title: string; source: string; amountMinor: number; fields: string; note: string; createdAt: string; updatedAt: string; contactName?: string; contactPhone?: string | null; stageName?: string; stageKind?: string }[]> {
    const rows = this.db
      .prepare(
        `SELECT d.id AS id, d.contact_id AS contactId, d.stage_id AS stageId, d.assignee_id AS assigneeId,
                d.title AS title, d.source AS source, d.amount_minor AS amountMinor, d.fields AS fields, d.note AS note,
                d.created_at AS createdAt, d.updated_at AS updatedAt,
                c.name AS contactName, c.phone AS contactPhone,
                s.name AS stageName, s.kind AS stageKind
         FROM sales_deals d
         JOIN sales_contacts c ON c.tenant_id = d.tenant_id AND c.id = d.contact_id
         JOIN sales_stages s ON s.tenant_id = d.tenant_id AND s.id = d.stage_id
         WHERE d.tenant_id = ?
         ORDER BY d.updated_at DESC, d.id
         LIMIT 500`,
      )
      .all(tenantId);
    return (rows as unknown as SalesDealCamelRow[]).map((row) => ({
      ...row,
      amountMinor: Number(row.amountMinor),
      fields: row.fields ?? "{}",
    }));
  }

  async getSalesDeal(tenantId: string, id: string): Promise<{ id: string; contactId: string; stageId: string; assigneeId: string | null; title: string; source: string; amountMinor: number; fields: string; note: string; createdAt: string; updatedAt: string; contactName?: string; contactPhone?: string | null; stageName?: string; stageKind?: string } | null> {
    const row = this.db
      .prepare(
        `SELECT d.id AS id, d.contact_id AS contactId, d.stage_id AS stageId, d.assignee_id AS assigneeId,
                d.title AS title, d.source AS source, d.amount_minor AS amountMinor, d.fields AS fields, d.note AS note,
                d.created_at AS createdAt, d.updated_at AS updatedAt,
                c.name AS contactName, c.phone AS contactPhone,
                s.name AS stageName, s.kind AS stageKind
         FROM sales_deals d
         JOIN sales_contacts c ON c.tenant_id = d.tenant_id AND c.id = d.contact_id
         JOIN sales_stages s ON s.tenant_id = d.tenant_id AND s.id = d.stage_id
         WHERE d.tenant_id = ? AND d.id = ?`,
      )
      .get(tenantId, id);
    if (!row) return null;
    const r = row as unknown as SalesDealCamelRow;
    return { ...r, amountMinor: Number(r.amountMinor), fields: r.fields ?? "{}" };
  }

  async updateSalesDeal(
    tenantId: string,
    id: string,
    patch: { stageId?: string; title?: string; note?: string; amountMinor?: number; assigneeId?: string | null },
  ): Promise<{ id: string; contactId: string; stageId: string; assigneeId: string | null; title: string; source: string; amountMinor: number; fields: string; note: string; createdAt: string; updatedAt: string; contactName?: string; contactPhone?: string | null; stageName?: string; stageKind?: string } | null> {
    const sets: string[] = [];
    const params: SQLInputValue[] = [];
    if (patch.stageId !== undefined) { sets.push("stage_id = ?"); params.push(patch.stageId); }
    if (patch.title !== undefined) { sets.push("title = ?"); params.push(patch.title); }
    if (patch.note !== undefined) { sets.push("note = ?"); params.push(patch.note); }
    if (patch.amountMinor !== undefined) { sets.push("amount_minor = ?"); params.push(patch.amountMinor); }
    if (patch.assigneeId !== undefined) { sets.push("assignee_id = ?"); params.push(patch.assigneeId); }
    if (!sets.length) return this.getSalesDeal(tenantId, id);
    const prev = this.db.prepare("SELECT stage_id FROM sales_deals WHERE tenant_id = ? AND id = ?").get(tenantId, id) as { stage_id: string } | undefined;
    if (!prev) return null;
    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(tenantId, id);
    this.db.prepare(`UPDATE sales_deals SET ${sets.join(", ")} WHERE tenant_id = ? AND id = ?`).run(...params);
    if (patch.stageId !== undefined && patch.stageId !== prev.stage_id) {
      this.db
        .prepare("INSERT INTO sales_activity (tenant_id, deal_id, kind, data) VALUES (?, ?, 'stage_changed', ?)")
        .run(tenantId, id, JSON.stringify({ from: prev.stage_id, to: patch.stageId }));
    }
    return this.getSalesDeal(tenantId, id);
  }

  async createSalesDeal(
    tenantId: string,
    id: string,
    contactId: string,
    stageId: string,
    title: string,
    source: string,
    amountMinor: number,
    note: string,
  ): Promise<{ id: string; contactId: string; stageId: string; assigneeId: string | null; title: string; source: string; amountMinor: number; fields: string; note: string; createdAt: string; updatedAt: string } | null> {
    const existing = this.db.prepare("SELECT 1 FROM sales_deals WHERE tenant_id = ? AND id = ?").get(tenantId, id);
    if (existing) return null;
    this.db.prepare(
      `INSERT INTO sales_deals (tenant_id, id, contact_id, stage_id, title, source, amount_minor, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(tenantId, id, contactId, stageId, title, source, amountMinor, note);
    return this.getSalesDeal(tenantId, id);
  }

  async deleteSalesDeal(tenantId: string, id: string): Promise<boolean> {
    const r = this.db.prepare("DELETE FROM sales_deals WHERE tenant_id = ? AND id = ?").run(tenantId, id);
    return r.changes > 0;
  }

  async claimSalesDeal(
    tenantId: string,
    dealId: string,
    memberId: string,
  ): Promise<"ok" | "already-claimed" | "not-found" | "no-member"> {
    const member = this.db.prepare("SELECT id FROM sales_members WHERE tenant_id = ? AND id = ?").get(tenantId, memberId);
    if (!member) return "no-member";
    const r = this.db.prepare(
      `UPDATE sales_deals SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = ? AND id = ? AND assignee_id IS NULL`,
    ).run(memberId, tenantId, dealId);
    if (r.changes > 0) return "ok";
    const exists = this.db.prepare("SELECT 1 FROM sales_deals WHERE tenant_id = ? AND id = ?").get(tenantId, dealId);
    if (!exists) return "not-found";
    return "already-claimed";
  }

  // ---- contacts ----

  async listSalesContacts(tenantId: string, opts?: PageOpts): Promise<{ id: string; name: string; phone: string | null; phoneVerified: boolean; tags: string[]; createdAt: string }[]> {
    const [limit, offset] = pageParams(opts);
    const rows = this.db
      .prepare("SELECT id, name, phone, phone_verified, tags, created_at FROM sales_contacts WHERE tenant_id = ? ORDER BY name LIMIT ? OFFSET ?")
      .all(tenantId, limit, offset) as SalesContactRow[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      phoneVerified: Boolean(r.phone_verified),
      tags: typeof r.tags === "string" ? (JSON.parse(r.tags || "[]") as string[]) : [],
      createdAt: r.created_at,
    }));
  }

  async createSalesContact(tenantId: string, name: string, phone: string | null): Promise<{ id: string; name: string; phone: string | null; phoneVerified: boolean; tags: string[]; createdAt: string } | null> {
    if (phone) {
      const existing = this.db.prepare("SELECT 1 FROM sales_contacts WHERE tenant_id = ? AND phone = ?").get(tenantId, phone);
      if (existing) return null;
    }
    const id = randomUUID();
    const r = this.db
      .prepare(
        `INSERT INTO sales_contacts (tenant_id, id, name, phone) VALUES (?, ?, ?, ?)
         RETURNING id, name, phone, phone_verified, tags, created_at`,
      )
      .get(tenantId, id, name, phone) as SalesContactRow | undefined;
    if (!r) return null;
    return { id: r.id, name: r.name, phone: r.phone, phoneVerified: Boolean(r.phone_verified), tags: JSON.parse(r.tags ?? "[]"), createdAt: r.created_at };
  }

  async getSalesContact(tenantId: string, id: string): Promise<{ id: string; name: string; phone: string | null; phoneVerified: boolean; tags: string[]; createdAt: string } | null> {
    const r = this.db
      .prepare("SELECT id, name, phone, phone_verified, tags, created_at FROM sales_contacts WHERE tenant_id = ? AND id = ?")
      .get(tenantId, id) as SalesContactRow | undefined;
    if (!r) return null;
    return { id: r.id, name: r.name, phone: r.phone, phoneVerified: Boolean(r.phone_verified), tags: JSON.parse(r.tags ?? "[]"), createdAt: r.created_at };
  }

  async deleteSalesContact(tenantId: string, id: string): Promise<boolean> {
    const r = this.db.prepare("DELETE FROM sales_contacts WHERE tenant_id = ? AND id = ?").run(tenantId, id);
    return r.changes > 0;
  }

  // ---- tasks ----

  async listSalesTasks(tenantId: string, dealId?: string, opts?: PageOpts): Promise<{ id: string; dealId: string; assigneeId: string | null; title: string; body: string; status: "open" | "done" | "canceled"; dueAt: string | null; createdAt: string; updatedAt: string }[]> {
    const [limit, offset] = pageParams(opts);
    const rows = dealId
      ? this.db
          .prepare(
            `SELECT id, deal_id AS dealId, assignee_id AS assigneeId, title, body, status, due_at AS dueAt, created_at AS createdAt, updated_at AS updatedAt
             FROM sales_tasks WHERE tenant_id = ? AND deal_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          )
          .all(tenantId, dealId, limit, offset)
      : this.db
          .prepare(
            `SELECT id, deal_id AS dealId, assignee_id AS assigneeId, title, body, status, due_at AS dueAt, created_at AS createdAt, updated_at AS updatedAt
             FROM sales_tasks WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          )
          .all(tenantId, limit, offset);
    return (rows as unknown as SalesTaskCamelRow[]).map((row) => ({ ...row, assigneeId: row.assigneeId ?? null, dueAt: row.dueAt ?? null }));
  }

  async createSalesTask(
    tenantId: string,
    dealId: string,
    title: string,
    body: string,
    assigneeId: string | null,
    dueAt: string | null,
  ): Promise<{ id: string; dealId: string; assigneeId: string | null; title: string; body: string; status: "open" | "done" | "canceled"; dueAt: string | null; createdAt: string; updatedAt: string } | null> {
    const id = randomUUID();
    const r = this.db
      .prepare(
        `INSERT INTO sales_tasks (tenant_id, id, deal_id, assignee_id, title, body, due_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id, deal_id AS dealId, assignee_id AS assigneeId, title, body, status, due_at AS dueAt, created_at AS createdAt, updated_at AS updatedAt`,
      )
      .get(tenantId, id, dealId, assigneeId, title, body, dueAt) as unknown as SalesTaskCamelRow | undefined;
    if (!r) return null;
    this.db
      .prepare("INSERT INTO sales_activity (tenant_id, deal_id, kind, data) VALUES (?, ?, 'task_created', ?)")
      .run(tenantId, dealId, JSON.stringify({ taskId: id, title }));
    return { ...r, assigneeId: r.assigneeId ?? null, dueAt: r.dueAt ?? null };
  }

  async updateSalesTask(
    tenantId: string,
    id: string,
    patch: { title?: string; body?: string; status?: "open" | "done" | "canceled"; assigneeId?: string | null; dueAt?: string | null },
  ): Promise<{ id: string; dealId: string; assigneeId: string | null; title: string; body: string; status: "open" | "done" | "canceled"; dueAt: string | null; createdAt: string; updatedAt: string } | null> {
    const sets: string[] = [];
    const params: SQLInputValue[] = [];
    if (patch.title !== undefined) { sets.push("title = ?"); params.push(patch.title); }
    if (patch.body !== undefined) { sets.push("body = ?"); params.push(patch.body); }
    if (patch.status !== undefined) { sets.push("status = ?"); params.push(patch.status); }
    if (patch.assigneeId !== undefined) { sets.push("assignee_id = ?"); params.push(patch.assigneeId); }
    if (patch.dueAt !== undefined) { sets.push("due_at = ?"); params.push(patch.dueAt); }
    if (!sets.length) return null;
    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(tenantId, id);
    const upd = this.db.prepare(`UPDATE sales_tasks SET ${sets.join(", ")} WHERE tenant_id = ? AND id = ?`).run(...params);
    if (upd.changes === 0) return null;
    const row = this.db.prepare("SELECT id, deal_id AS dealId, assignee_id AS assigneeId, title, body, status, due_at AS dueAt, created_at AS createdAt, updated_at AS updatedAt FROM sales_tasks WHERE tenant_id = ? AND id = ?").get(tenantId, id) as unknown as SalesTaskCamelRow | undefined;
    if (!row) return null;
    if (patch.status === "done") {
      this.db
        .prepare("INSERT INTO sales_activity (tenant_id, deal_id, kind, data) VALUES (?, ?, 'task_done', ?)")
        .run(tenantId, row.dealId, JSON.stringify({ taskId: id, title: row.title }));
    }
    return { ...row, assigneeId: row.assigneeId ?? null, dueAt: row.dueAt ?? null };
  }

  async deleteSalesTask(tenantId: string, id: string): Promise<boolean> {
    const r = this.db.prepare("DELETE FROM sales_tasks WHERE tenant_id = ? AND id = ?").run(tenantId, id);
    return r.changes > 0;
  }

  // ---- notes ----

  async listSalesNotes(tenantId: string, dealId?: string, opts?: PageOpts): Promise<{ id: string; dealId: string; authorId: string | null; body: string; createdAt: string }[]> {
    const [limit, offset] = pageParams(opts);
    const rows = dealId
      ? this.db
          .prepare("SELECT id, deal_id AS dealId, author_id AS authorId, body, created_at AS createdAt FROM sales_notes WHERE tenant_id = ? AND deal_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
          .all(tenantId, dealId, limit, offset)
      : this.db
          .prepare("SELECT id, deal_id AS dealId, author_id AS authorId, body, created_at AS createdAt FROM sales_notes WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
          .all(tenantId, limit, offset);
    return (rows as unknown as SalesNoteCamelRow[]).map((row) => ({ ...row, authorId: row.authorId ?? null }));
  }

  async createSalesNote(
    tenantId: string,
    dealId: string,
    body: string,
    authorId: string | null,
  ): Promise<{ id: string; dealId: string; authorId: string | null; body: string; createdAt: string } | null> {
    const id = randomUUID();
    const r = this.db
      .prepare(
        `INSERT INTO sales_notes (tenant_id, id, deal_id, author_id, body)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, deal_id AS dealId, author_id AS authorId, body, created_at AS createdAt`,
      )
      .get(tenantId, id, dealId, authorId, body) as unknown as SalesNoteCamelRow | undefined;
    if (!r) return null;
    this.db
      .prepare("INSERT INTO sales_activity (tenant_id, deal_id, kind, data) VALUES (?, ?, 'note_added', ?)")
      .run(tenantId, dealId, JSON.stringify({ noteId: id }));
    return { ...r, authorId: r.authorId ?? null };
  }

  async deleteSalesNote(tenantId: string, id: string): Promise<boolean> {
    const r = this.db.prepare("DELETE FROM sales_notes WHERE tenant_id = ? AND id = ?").run(tenantId, id);
    return r.changes > 0;
  }

  // ---- custom fields ----

  async listSalesFieldDefs(tenantId: string): Promise<{ id: string; name: string; kind: "text" | "number" | "date" | "boolean"; required: boolean; position: number }[]> {
    const rows = this.db
      .prepare("SELECT id, name, kind, required, position FROM sales_custom_field_defs WHERE tenant_id = ? ORDER BY position, id")
      .all(tenantId) as SalesFieldDefRow[];
    return rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind as "text" | "number" | "date" | "boolean", required: Boolean(r.required), position: r.position }));
  }

  async createSalesFieldDef(
    tenantId: string,
    name: string,
    kind: "text" | "number" | "date" | "boolean",
    required: boolean,
  ): Promise<{ id: string; name: string; kind: "text" | "number" | "date" | "boolean"; required: boolean; position: number } | null> {
    const id = randomUUID();
    const maxPos = this.db
      .prepare("SELECT COALESCE(MAX(position), -1) AS m FROM sales_custom_field_defs WHERE tenant_id = ?")
      .get(tenantId) as { m: number };
    const r = this.db
      .prepare(
        `INSERT INTO sales_custom_field_defs (tenant_id, id, name, kind, required, position)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING id, name, kind, required, position`,
      )
      .get(tenantId, id, name, kind, required ? 1 : 0, Number(maxPos.m) + 1) as SalesFieldDefRow | undefined;
    if (!r) return null;
    return { id: r.id, name: r.name, kind: r.kind as "text" | "number" | "date" | "boolean", required: Boolean(r.required), position: r.position };
  }

  async updateSalesFieldDef(
    tenantId: string,
    id: string,
    patch: { name?: string; required?: boolean; position?: number },
  ): Promise<{ id: string; name: string; kind: "text" | "number" | "date" | "boolean"; required: boolean; position: number } | null> {
    const sets: string[] = [];
    const params: SQLInputValue[] = [];
    if (patch.name !== undefined) { sets.push("name = ?"); params.push(patch.name); }
    if (patch.required !== undefined) { sets.push("required = ?"); params.push(patch.required ? 1 : 0); }
    if (patch.position !== undefined) { sets.push("position = ?"); params.push(patch.position); }
    if (!sets.length) return null;
    params.push(tenantId, id);
    const row = this.db.prepare(`SELECT 1 FROM sales_custom_field_defs WHERE tenant_id = ? AND id = ?`).get(tenantId, id);
    if (!row) return null;
    this.db.prepare(`UPDATE sales_custom_field_defs SET ${sets.join(", ")} WHERE tenant_id = ? AND id = ?`).run(...params);
    const r = this.db.prepare("SELECT id, name, kind, required, position FROM sales_custom_field_defs WHERE tenant_id = ? AND id = ?").get(tenantId, id) as SalesFieldDefRow;
    return { id: r.id, name: r.name, kind: r.kind as "text" | "number" | "date" | "boolean", required: Boolean(r.required), position: r.position };
  }

  async deleteSalesFieldDef(tenantId: string, id: string): Promise<boolean> {
    const r = this.db.prepare("DELETE FROM sales_custom_field_defs WHERE tenant_id = ? AND id = ?").run(tenantId, id);
    return r.changes > 0;
  }

  async getSalesDealFieldValues(tenantId: string, dealId: string): Promise<{ fieldId: string; value: string }[]> {
    const rows = this.db
      .prepare("SELECT field_id, value FROM sales_deal_field_values WHERE tenant_id = ? AND deal_id = ?")
      .all(tenantId, dealId) as SalesFieldValueRow[];
    return rows.map((r) => ({ fieldId: r.field_id, value: r.value }));
  }

  async setSalesDealFieldValues(
    tenantId: string,
    dealId: string,
    values: { fieldId: string; value: string }[],
  ): Promise<void> {
    const ownTx = !this.db.isTransaction;
    if (ownTx) this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM sales_deal_field_values WHERE tenant_id = ? AND deal_id = ?").run(tenantId, dealId);
      const insert = this.db.prepare("INSERT INTO sales_deal_field_values (tenant_id, deal_id, field_id, value) VALUES (?, ?, ?, ?)");
      for (const v of values) insert.run(tenantId, dealId, v.fieldId, v.value);
      if (ownTx) this.db.exec("COMMIT");
    } catch (err) {
      if (ownTx) {
        try { this.db.exec("ROLLBACK"); } catch { /* no open transaction */ }
      }
      throw err;
    }
  }

  // ---- members ----

  async listSalesMembers(tenantId: string): Promise<{ id: string; name: string; role: "owner" | "manager" | "operator" }[]> {
    const rows = this.db
      .prepare("SELECT id, name, role FROM sales_members WHERE tenant_id = ? ORDER BY name")
      .all(tenantId) as SalesMemberRow[];
    return rows.map((r) => ({ id: r.id, name: r.name, role: r.role as "owner" | "manager" | "operator" }));
  }

  async createSalesMember(
    tenantId: string,
    id: string,
    name: string,
    role: "owner" | "manager" | "operator",
  ): Promise<{ id: string; name: string; role: "owner" | "manager" | "operator" } | null> {
    const existing = this.db.prepare("SELECT 1 FROM sales_members WHERE tenant_id = ? AND id = ?").get(tenantId, id);
    if (existing) return null;
    const r = this.db
      .prepare("INSERT INTO sales_members (tenant_id, id, name, role) VALUES (?, ?, ?, ?) RETURNING id, name, role")
      .get(tenantId, id, name, role) as SalesMemberRow | undefined;
    return r ? { id: r.id, name: r.name, role: r.role as "owner" | "manager" | "operator" } : null;
  }

  // ---- phone matches ----

  async listSalesPhoneMatches(tenantId: string, opts?: PageOpts): Promise<{ id: string; contactId: string; normalizedPhone: string; channel: string; senderId: string; confirmed: boolean; createdAt: string }[]> {
    const [limit, offset] = pageParams(opts);
    const rows = this.db
      .prepare("SELECT id, contact_id AS contactId, normalized_phone AS normalizedPhone, channel, sender_id AS senderId, confirmed, created_at AS createdAt FROM sales_phone_matches WHERE tenant_id = ? AND confirmed = 0 ORDER BY created_at LIMIT ? OFFSET ?")
      .all(tenantId, limit, offset);
    return (rows as unknown as SalesPhoneMatchCamelRow[]).map((row) => ({ ...row, confirmed: Boolean(row.confirmed) }));
  }

  async confirmSalesPhoneMatch(tenantId: string, id: string): Promise<boolean> {
    const row = this.db
      .prepare("SELECT contact_id FROM sales_phone_matches WHERE tenant_id = ? AND id = ? AND confirmed = 0")
      .get(tenantId, id) as { contact_id: string } | undefined;
    if (!row) return false;
    const r = this.db.prepare("UPDATE sales_phone_matches SET confirmed = 1 WHERE tenant_id = ? AND id = ? AND confirmed = 0").run(tenantId, id);
    if (r.changes > 0) {
      this.db.prepare("UPDATE sales_contacts SET phone_verified = 1 WHERE tenant_id = ? AND id = ?").run(tenantId, row.contact_id);
      return true;
    }
    return false;
  }

  // ---- workspace ----

  async getSalesWorkspace(tenantId: string): Promise<{ id: string; name: string; locale: string; timezone: string; currency: string } | null> {
    const r = this.db
      .prepare("SELECT id, name, locale, timezone, currency FROM sales_workspaces WHERE id = ?")
      .get(tenantId) as SalesWorkspaceRow | undefined;
    return r ? { id: r.id, name: r.name, locale: r.locale, timezone: r.timezone, currency: r.currency } : null;
  }

  async updateSalesWorkspace(
    tenantId: string,
    patch: { name?: string; locale?: string; timezone?: string; currency?: string },
  ): Promise<{ id: string; name: string; locale: string; timezone: string; currency: string } | null> {
    const sets: string[] = [];
    const params: SQLInputValue[] = [];
    if (patch.name !== undefined) { sets.push("name = ?"); params.push(patch.name); }
    if (patch.locale !== undefined) { sets.push("locale = ?"); params.push(patch.locale); }
    if (patch.timezone !== undefined) { sets.push("timezone = ?"); params.push(patch.timezone); }
    if (patch.currency !== undefined) { sets.push("currency = ?"); params.push(patch.currency); }
    if (!sets.length) return this.getSalesWorkspace(tenantId);
    params.push(tenantId);
    this.db.prepare(`UPDATE sales_workspaces SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return this.getSalesWorkspace(tenantId);
  }

  // ---- messages, timeline & inbound ingest ----

  async listSalesDealMessages(tenantId: string, dealId: string, opts?: PageOpts) {
    const [limit, offset] = pageParams(opts);
    return this.db
      .prepare(
        `SELECT m.id, m.direction, m.sender, m.body, m.status, m.created_at AS createdAt, t.channel, t.id AS threadId
         FROM sales_messages m
         JOIN sales_threads t ON t.tenant_id = m.tenant_id AND t.id = m.thread_id
         WHERE m.tenant_id = ? AND m.deal_id = ?
         ORDER BY m.created_at ASC, m.id LIMIT ? OFFSET ?`,
      )
      .all(tenantId, dealId, limit, offset);
  }

  async sendSalesDealReply(
    tenantId: string,
    dealId: string,
    body: string,
  ): Promise<{ ok: true; message: { id: string; dealId: string; body: string; direction: "out"; sender: "staff"; status: "queued" } } | { ok: false; error: "not_found" | "no_thread" | "reply_window_expired" }> {
    const deal = this.db.prepare("SELECT id FROM sales_deals WHERE tenant_id = ? AND id = ?").get(tenantId, dealId);
    if (!deal) return { ok: false, error: "not_found" };
    const thread = this.db
      .prepare(
        `SELECT id, connection_id, channel, last_inbound_at
         FROM sales_threads
         WHERE tenant_id = ? AND deal_id = ?
         ORDER BY last_inbound_at DESC, id DESC
         LIMIT 1`,
      )
      .get(tenantId, dealId) as { id: string; connection_id: string | null; channel: string; last_inbound_at: string | null } | undefined;
    if (!thread) return { ok: false, error: "no_thread" };
    if (thread.channel === "whatsapp" || thread.channel === "instagram") {
      const lastMs = thread.last_inbound_at ? new Date(thread.last_inbound_at).getTime() : 0;
      if (!lastMs || Date.now() - lastMs > 24 * 60 * 60 * 1000) {
        return { ok: false, error: "reply_window_expired" };
      }
    }
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO sales_messages (tenant_id, id, thread_id, deal_id, connection_id, provider_event_id, direction, sender, body, status)
         VALUES (?, ?, ?, ?, ?, ?, 'out', 'staff', ?, 'queued')`,
      )
      .run(tenantId, id, thread.id, dealId, thread.connection_id, `out:${id}`, body);
    this.db
      .prepare("INSERT INTO sales_outbox (tenant_id, message_id, available_at) VALUES (?, ?, ?)")
      .run(tenantId, id, new Date().toISOString());
    this.db.prepare("UPDATE sales_deals SET updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ? AND id = ?").run(tenantId, dealId);
    return { ok: true, message: { id, dealId, body, direction: "out", sender: "staff", status: "queued" } };
  }

  async listSalesTimeline(tenantId: string, dealId: string, opts?: PageOpts) {
    const [limit, offset] = pageParams(opts);
    const msgs = this.db
      .prepare("SELECT 'message' AS kind, id, direction, sender, body, created_at FROM sales_messages WHERE tenant_id = ? AND deal_id = ? ORDER BY created_at ASC, id LIMIT ? OFFSET ?")
      .all(tenantId, dealId, limit, offset) as Array<{ kind: string; id: string; direction: string; sender: string; body: string; created_at: string }>;
    const acts = this.db
      .prepare("SELECT 'activity' AS kind, id, kind AS activity_kind, data, created_at FROM sales_activity WHERE tenant_id = ? AND deal_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?")
      .all(tenantId, dealId, limit, offset) as Array<{ kind: string; id: number; activity_kind: string; data: string; created_at: string }>;
    const entries = [
      ...msgs.map((r) => ({ kind: r.kind, id: r.id, direction: r.direction, sender: r.sender, body: r.body, createdAt: r.created_at })),
      ...acts.map((r) => ({ kind: r.kind, id: r.id, activityKind: r.activity_kind, data: JSON.parse(r.data || "{}"), createdAt: r.created_at })),
    ];
    entries.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
    return entries;
  }

  ingestSalesMessage(tenantId: string, message: InboundMessage, normalizedPhone: string | null): boolean {
    const { channel, account, event, sender, name, text } = message;
    const connection = `${channel}:${account}`;
    this.initializeSalesWorkspace(tenantId);
    this.db
      .prepare("INSERT OR IGNORE INTO sales_connections (tenant_id, id, channel, account) VALUES (?, ?, ?, ?)")
      .run(tenantId, connection, channel, account);
    const channelRow = this.db
      .prepare("SELECT active FROM sales_connections WHERE tenant_id = ? AND id = ?")
      .get(tenantId, connection) as { active: number } | undefined;
    if (!channelRow?.active) return false;

    const seen = this.db
      .prepare("SELECT 1 FROM sales_messages WHERE tenant_id = ? AND connection_id = ? AND provider_event_id = ?")
      .get(tenantId, connection, event);
    if (seen) return false;

    const thread = this.db
      .prepare("SELECT id, contact_id, deal_id FROM sales_threads WHERE tenant_id = ? AND connection_id = ? AND sender_id = ?")
      .get(tenantId, connection, sender) as { id: string; contact_id: string; deal_id: string } | undefined;

    let contactId = thread?.contact_id;
    if (!contactId && normalizedPhone) {
      const byPhone = this.db
        .prepare("SELECT id FROM sales_contacts WHERE tenant_id = ? AND phone = ?")
        .get(tenantId, normalizedPhone) as { id: string } | undefined;
      contactId = byPhone?.id;
    }
    if (!contactId) {
      contactId = randomUUID();
      this.db
        .prepare("INSERT INTO sales_contacts (tenant_id, id, name, phone) VALUES (?, ?, ?, ?)")
        .run(tenantId, contactId, name, normalizedPhone);
    }

    if (normalizedPhone) {
      const confirmed = this.db
        .prepare("SELECT confirmed FROM sales_phone_matches WHERE tenant_id = ? AND normalized_phone = ?")
        .get(tenantId, normalizedPhone) as { confirmed: number } | undefined;
      if (!confirmed || !confirmed.confirmed) {
        this.db
          .prepare(
            `INSERT INTO sales_phone_matches (tenant_id, id, contact_id, normalized_phone, channel, sender_id, confirmed)
             VALUES (?, ?, ?, ?, ?, ?, 0)
             ON CONFLICT (tenant_id, normalized_phone) DO UPDATE SET
               contact_id = COALESCE(sales_phone_matches.contact_id, excluded.contact_id)`,
          )
          .run(tenantId, randomUUID(), contactId, normalizedPhone, channel, sender);
      }
    }

    const open = this.db
      .prepare(
        `SELECT d.id FROM sales_deals d
         JOIN sales_stages s ON s.tenant_id = d.tenant_id AND s.id = d.stage_id
         WHERE d.tenant_id = ? AND d.contact_id = ? AND s.kind = 'open'
         ORDER BY (d.id = ?) DESC, d.updated_at DESC, d.id LIMIT 1`,
      )
      .get(tenantId, contactId, thread?.deal_id ?? null) as { id: string } | undefined;
    let deal = open?.id;
    if (!deal) {
      deal = randomUUID();
      const firstOpenStage = this.db
        .prepare("SELECT id FROM sales_stages WHERE tenant_id = ? AND kind = 'open' ORDER BY position, id LIMIT 1")
        .get(tenantId) as { id: string } | undefined;
      this.db
        .prepare("INSERT INTO sales_deals (tenant_id, id, contact_id, stage_id, title, source) VALUES (?, ?, ?, ?, ?, ?)")
        .run(tenantId, deal, contactId, firstOpenStage?.id ?? "new", name, channel);
    } else {
      this.db.prepare("UPDATE sales_deals SET updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ? AND id = ?").run(tenantId, deal);
    }

    const threadId = thread?.id ?? randomUUID();
    const nowIso = new Date().toISOString();
    if (thread) {
      this.db
        .prepare("UPDATE sales_threads SET deal_id = ?, last_inbound_at = ? WHERE tenant_id = ? AND id = ?")
        .run(deal, nowIso, tenantId, threadId);
    } else {
      this.db
        .prepare(
          `INSERT INTO sales_threads (tenant_id, id, connection_id, contact_id, deal_id, channel, sender_id, last_inbound_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(tenantId, threadId, connection, contactId, deal, channel, sender, nowIso);
    }

    this.db
      .prepare(
        `INSERT INTO sales_messages (tenant_id, id, thread_id, deal_id, connection_id, provider_event_id, direction, sender, body, status)
         VALUES (?, ?, ?, ?, ?, ?, 'in', 'student', ?, 'received')`,
      )
      .run(tenantId, randomUUID(), threadId, deal, connection, event, text);
    return true;
  }
}
