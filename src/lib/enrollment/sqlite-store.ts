import { DatabaseSync } from "node:sqlite";
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
        normalized_phone TEXT NOT NULL CHECK (normalized_phone GLOB '+994[1-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
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
    `);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.initializeWorkspaceSqlite();
  }

  private initializeWorkspaceSqlite() {
    this.db.prepare("INSERT OR IGNORE INTO sales_workspaces (id, name) VALUES (?, ?)").run("default", "default");
    for (const [id, name, position, kind] of [
      ["new","Yeni",0,"open"],["contacted","Əlaqə saxlanılıb",1,"open"],
      ["trial_booked","Rezervasiya",2,"open"],["paid","Qazanılıb",3,"won"],["lost","İtirilib",4,"lost"],
    ]) {
      this.db.prepare("INSERT OR IGNORE INTO sales_stages (tenant_id,id,name,position,kind) VALUES (?,?,?,?,?)")
        .run("default", id, name, position, kind);
    }
  }

  close() {
    this.db.close();
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
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const s = this.db.prepare("SELECT capacity FROM sessions WHERE tenant_id = ? AND id = ?").get(e.tenantId, e.sessionId) as
        | { capacity: number }
        | undefined;
      if (!s) {
        this.db.exec("ROLLBACK");
        return "unknown_session";
      }
      const dup = this.db
        .prepare("SELECT 1 AS x FROM enrollments WHERE tenant_id = ? AND session_id = ? AND phone = ?")
        .get(e.tenantId, e.sessionId, e.phone);
      if (dup) {
        this.db.exec("ROLLBACK");
        return "duplicate";
      }
      const n = this.db
        .prepare("SELECT COUNT(*) AS n FROM enrollments WHERE tenant_id = ? AND session_id = ?")
        .get(e.tenantId, e.sessionId) as { n: number };
      if (Number(n.n) >= s.capacity) {
        this.db.exec("ROLLBACK");
        return "full";
      }
      this.db
        .prepare("INSERT INTO enrollments (id, tenant_id, session_id, name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(e.id, e.tenantId, e.sessionId, e.name, e.phone, e.createdAt);
      this.db.exec("COMMIT");
      return "inserted";
    } catch (err) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        /* no open transaction */
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
}
