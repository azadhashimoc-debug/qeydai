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

export interface PgClient {
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

export interface PgPool extends PgClient {
  connect(): Promise<PgClient & { release(): void }>;
}

type SessionRow = {
  id: string;
  tenant_id: string;
  course_id: string;
  starts_at: string | Date;
  capacity: number;
};

type SessionSummaryRow = SessionRow & {
  taken: number | string;
};

type EnrollmentRow = {
  id: string;
  tenant_id: string;
  session_id: string;
  name: string;
  phone: string;
  created_at: string | Date;
};

type CrmLeadRow = {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  note: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type InboxMessageRow = {
  id: string;
  tenant_id: string;
  lead_id: string;
  channel: LeadSource;
  direction: MessageDirection;
  sender: MessageSender;
  body: string;
  created_at: string | Date;
};

function toIso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v;
}

function toSession(r: SessionRow): Session {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    courseId: r.course_id,
    startsAt: toIso(r.starts_at),
    capacity: Number(r.capacity),
  };
}

function toEnrollment(r: EnrollmentRow): Enrollment {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    sessionId: r.session_id,
    name: r.name,
    phone: r.phone,
    createdAt: toIso(r.created_at),
  };
}

function toLead(r: CrmLeadRow): CrmLead {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    phone: r.phone,
    source: r.source,
    stage: r.stage,
    note: r.note,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function toMessage(r: InboxMessageRow): InboxMessage {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    leadId: r.lead_id,
    channel: r.channel,
    direction: r.direction,
    sender: r.sender,
    body: r.body,
    createdAt: toIso(r.created_at),
  };
}

/**
 * PostgreSQL implementation of EnrollmentStore.
 * Uses `SELECT ... FOR UPDATE` on the locked session row inside an explicit transaction
 * plus `UNIQUE(tenant_id, session_id, phone)` to prevent double-booking and race overfills.
 */
export class PostgresEnrollmentStore implements EnrollmentStore {
  constructor(private pool: PgPool) {}

  /** All PostgreSQL enrollment queries run with tenant-bound, transaction-local RLS. */
  private scoped(tenantId: string): PgClient {
    if (!tenantId) throw new Error("tenant_required");
    return {
      query: async <R = Record<string, unknown>>(sql: string, params?: unknown[]) => {
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
          const result = await client.query<R>(sql, params);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          client.release();
        }
      },
    };
  }

  /** JTI revocations persist in tenant-isolated PostgreSQL across instances. */
  async revokePanelJti(jti: string, expMs: number, tenantId: string): Promise<void> {
    await this.scoped(tenantId).query(
      `INSERT INTO panel_revoked_jti (tenant_id,jti,exp_ms) VALUES ($1,$2,$3)
       ON CONFLICT (tenant_id,jti)
       DO UPDATE SET exp_ms=GREATEST(panel_revoked_jti.exp_ms, EXCLUDED.exp_ms)`,
      [tenantId, jti, expMs],
    );
  }

  async isPanelJtiRevoked(jti: string, nowMs: number, tenantId: string): Promise<boolean> {
    const { rows } = await this.scoped(tenantId).query<{ exp_ms: number | string }>(
      "SELECT exp_ms FROM panel_revoked_jti WHERE tenant_id=$1 AND jti=$2",
      [tenantId, jti],
    );
    return Number(rows[0]?.exp_ms ?? 0) > nowMs;
  }

  async requireSalesMember(
    tenantId: string, memberId: string | null,
  ): Promise<{ memberId: string; role: "owner" | "manager" | "operator" } | null> {
    if (!memberId) return null;
    const { rows } = await this.scoped(tenantId).query<{ id: string; role: "owner" | "manager" | "operator" }>(
      "SELECT id,role FROM sales_members WHERE tenant_id=$1 AND id=$2",
      [tenantId, memberId],
    );
    return rows[0] ? { memberId: rows[0].id, role: rows[0].role } : null;
  }

  async createSession(s: Session): Promise<CreateSessionOutcome> {
    const { rows } = await this.scoped(s.tenantId).query<{ id: string }>(
      "INSERT INTO sessions (tenant_id, id, course_id, starts_at, capacity) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, id) DO NOTHING RETURNING id",
      [s.tenantId, s.id, s.courseId, s.startsAt, s.capacity],
    );
    return rows.length === 1 ? "created" : "exists";
  }

  async getSession(tenantId: string, sessionId: string): Promise<Session | null> {
    const { rows } = await this.scoped(tenantId).query<SessionRow>(
      "SELECT id, tenant_id, course_id, starts_at, capacity FROM sessions WHERE tenant_id = $1 AND id = $2",
      [tenantId, sessionId],
    );
    return rows[0] ? toSession(rows[0]) : null;
  }

  async listSessions(tenantId: string): Promise<Session[]> {
    const { rows } = await this.scoped(tenantId).query<SessionRow>(
      "SELECT id, tenant_id, course_id, starts_at, capacity FROM sessions WHERE tenant_id = $1 ORDER BY starts_at ASC",
      [tenantId],
    );
    return rows.map(toSession);
  }

  async countBySession(tenantId: string, sessionId: string): Promise<number> {
    const { rows } = await this.scoped(tenantId).query<{ n: number | string }>(
      "SELECT COUNT(*)::int AS n FROM enrollments WHERE tenant_id = $1 AND session_id = $2",
      [tenantId, sessionId],
    );
    return Number(rows[0]?.n ?? 0);
  }

  async countBySessions(tenantId: string, sessionIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (sessionIds.length === 0) return counts;
    const { rows } = await this.scoped(tenantId).query<{ session_id: string; n: number | string }>(
      "SELECT session_id, COUNT(*)::int AS n FROM enrollments WHERE tenant_id = $1 AND session_id = ANY($2::text[]) GROUP BY session_id",
      [tenantId, sessionIds],
    );
    for (const id of sessionIds) counts.set(id, 0);
    for (const row of rows) counts.set(row.session_id, Number(row.n));
    return counts;
  }

  async insertIfAvailable(e: Enrollment): Promise<InsertOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [e.tenantId]);
      const { rows: sessionRows } = await client.query<{ capacity: number }>(
        "SELECT capacity FROM sessions WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
        [e.tenantId, e.sessionId],
      );
      if (sessionRows.length === 0) {
        await client.query("ROLLBACK");
        return "unknown_session";
      }

      const { rows: dupRows } = await client.query<{ x: number }>(
        "SELECT 1 AS x FROM enrollments WHERE tenant_id = $1 AND session_id = $2 AND phone = $3",
        [e.tenantId, e.sessionId, e.phone],
      );
      if (dupRows.length > 0) {
        await client.query("ROLLBACK");
        return "duplicate";
      }

      const { rows: countRows } = await client.query<{ n: number | string }>(
        "SELECT COUNT(*)::int AS n FROM enrollments WHERE tenant_id = $1 AND session_id = $2",
        [e.tenantId, e.sessionId],
      );
      if (Number(countRows[0]?.n ?? 0) >= Number(sessionRows[0].capacity)) {
        await client.query("ROLLBACK");
        return "full";
      }

      await client.query(
        "INSERT INTO enrollments (id, tenant_id, session_id, name, phone, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [e.id, e.tenantId, e.sessionId, e.name, e.phone, e.createdAt],
      );
      await client.query("COMMIT");
      return "inserted";
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore rollback failure after aborted connection */
      }
      const pgErr = err as { code?: string };
      if (pgErr?.code === "23505") return "duplicate";
      throw err;
    } finally {
      client.release();
    }
  }

  async listEnrollments(tenantId: string, sessionId?: string): Promise<Enrollment[]> {
    const { rows } =
      sessionId === undefined
        ? await this.scoped(tenantId).query<EnrollmentRow>(
            "SELECT id, tenant_id, session_id, name, phone, created_at FROM enrollments WHERE tenant_id = $1 ORDER BY created_at DESC",
            [tenantId],
          )
        : await this.scoped(tenantId).query<EnrollmentRow>(
            "SELECT id, tenant_id, session_id, name, phone, created_at FROM enrollments WHERE tenant_id = $1 AND session_id = $2 ORDER BY created_at DESC",
            [tenantId, sessionId],
          );
    return rows.map(toEnrollment);
  }

  async listSessionsWithCounts(tenantId: string): Promise<SessionSummary[]> {
    const { rows } = await this.scoped(tenantId).query<SessionSummaryRow>(
      `SELECT s.id, s.tenant_id, s.course_id, s.starts_at, s.capacity, COUNT(e.id)::int AS taken
       FROM sessions s
       LEFT JOIN enrollments e ON e.tenant_id = s.tenant_id AND e.session_id = s.id
       WHERE s.tenant_id = $1
       GROUP BY s.tenant_id, s.id, s.course_id, s.starts_at, s.capacity
       ORDER BY s.starts_at ASC`,
      [tenantId],
    );
    return rows.map((r) => {
      const session = toSession(r);
      const taken = Number(r.taken ?? 0);
      return {
        session,
        taken,
        seatsLeft: Math.max(0, session.capacity - taken),
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
    const { rows } = await this.scoped(lead.tenantId).query<CrmLeadRow>(
      `INSERT INTO crm_leads (id, tenant_id, name, phone, source, stage, note, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id, phone) DO UPDATE SET
         name = EXCLUDED.name,
         source = EXCLUDED.source,
         stage = COALESCE($10::text, crm_leads.stage),
         note = CASE
           WHEN EXCLUDED.note = '' THEN crm_leads.note
           WHEN crm_leads.note = '' THEN EXCLUDED.note
           ELSE LEFT(crm_leads.note || E'\\n' || EXCLUDED.note, 10000)
         END,
         updated_at = EXCLUDED.updated_at
       RETURNING id, tenant_id, name, phone, source, stage, note, created_at, updated_at`,
      [
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
      ],
    );
    return toLead(rows[0]);
  }

  async listLeads(tenantId: string): Promise<CrmLead[]> {
    const { rows } = await this.scoped(tenantId).query<CrmLeadRow>(
      "SELECT id, tenant_id, name, phone, source, stage, note, created_at, updated_at FROM crm_leads WHERE tenant_id = $1 ORDER BY updated_at DESC",
      [tenantId],
    );
    return rows.map(toLead);
  }

  async getLead(tenantId: string, leadId: string): Promise<CrmLead | null> {
    const { rows } = await this.scoped(tenantId).query<CrmLeadRow>(
      "SELECT id, tenant_id, name, phone, source, stage, note, created_at, updated_at FROM crm_leads WHERE tenant_id = $1 AND id = $2",
      [tenantId, leadId],
    );
    return rows[0] ? toLead(rows[0]) : null;
  }

  async updateLead(
    tenantId: string,
    leadId: string,
    patch: { stage?: LeadStage; note?: string; updatedAt: string },
  ): Promise<CrmLead | null> {
    const { rows } = await this.scoped(tenantId).query<CrmLeadRow>(
      `UPDATE crm_leads
       SET stage = COALESCE($1::text, stage),
           note = COALESCE($2::text, note),
           updated_at = $3
       WHERE tenant_id = $4 AND id = $5
       RETURNING id, tenant_id, name, phone, source, stage, note, created_at, updated_at`,
      [patch.stage ?? null, patch.note ?? null, patch.updatedAt, tenantId, leadId],
    );
    return rows[0] ? toLead(rows[0]) : null;
  }

  async addMessage(msg: InboxMessage): Promise<InboxMessage | null> {
    try {
      const { rows } = await this.scoped(msg.tenantId).query<InboxMessageRow>(
        `INSERT INTO inbox_messages (id, tenant_id, lead_id, channel, direction, sender, body, created_at)
         SELECT $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text, $8::timestamptz
         WHERE EXISTS (SELECT 1 FROM crm_leads WHERE tenant_id = $2::text AND id = $3::text)
         RETURNING id, tenant_id, lead_id, channel, direction, sender, body, created_at`,
        [msg.id, msg.tenantId, msg.leadId, msg.channel, msg.direction, msg.sender, msg.body, msg.createdAt],
      );
      return rows[0] ? toMessage(rows[0]) : null;
    } catch (err) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === "23503") return null;
      throw err;
    }
  }

  async listMessages(tenantId: string, leadId?: string): Promise<InboxMessage[]> {
    const { rows } =
      leadId === undefined
        ? await this.scoped(tenantId).query<InboxMessageRow>(
            `SELECT id, tenant_id, lead_id, channel, direction, sender, body, created_at
             FROM inbox_messages
             WHERE tenant_id = $1
             ORDER BY created_at ASC
             LIMIT $2`,
            [tenantId, MAX_INBOX_MESSAGES],
          )
        : await this.scoped(tenantId).query<InboxMessageRow>(
            `SELECT id, tenant_id, lead_id, channel, direction, sender, body, created_at
             FROM inbox_messages
             WHERE tenant_id = $1 AND lead_id = $2
             ORDER BY created_at ASC
             LIMIT $3`,
            [tenantId, leadId, MAX_INBOX_MESSAGES],
          );
    return rows.map(toMessage);
  }
}
