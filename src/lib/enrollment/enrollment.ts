import { parseInstant, validateName } from "@/lib/validation";

export type Session = {
  id: string;
  tenantId: string;
  courseId: string;
  startsAt: string;
  capacity: number;
};

export type Enrollment = {
  id: string;
  tenantId: string;
  sessionId: string;
  name: string;
  phone: string;
  createdAt: string;
};

export type RegisterInput = { sessionId: string; name: string; phone: string };

export const LEAD_STAGES = ["new", "contacted", "trial_booked", "paid", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = ["telegram", "whatsapp", "instagram", "web", "manual"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const MESSAGE_DIRECTIONS = ["in", "out"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

export const MESSAGE_SENDERS = ["student", "ai", "staff"] as const;
export type MessageSender = (typeof MESSAGE_SENDERS)[number];

export type CrmLead = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type InboxMessage = {
  id: string;
  tenantId: string;
  leadId: string;
  channel: LeadSource;
  direction: MessageDirection;
  sender: MessageSender;
  body: string;
  createdAt: string;
};

export type SessionSummary = {
  session: Session;
  taken: number;
  seatsLeft: number;
};

export type RegisterResult =
  | { ok: true; enrollment: Enrollment }
  | { ok: false; reason: "invalid_input" | "unknown_session" | "session_started" | "full" | "duplicate" };

export type InsertOutcome = "inserted" | "full" | "duplicate" | "unknown_session";

/**
 * Store contract. `insertIfAvailable` MUST be atomic: capacity check, duplicate
 * check and insert happen as one step. A Postgres implementation does this with
 * `SELECT ... FOR UPDATE` on the session row plus a UNIQUE(tenant_id, session_id, phone).
 * Every method is tenant-scoped so one center can never see another's rows.
 */
export interface EnrollmentStore {
  getSession(tenantId: string, sessionId: string): Promise<Session | null>;
  listSessions(tenantId: string): Promise<Session[]>;
  countBySession(tenantId: string, sessionId: string): Promise<number>;
  countBySessions?(tenantId: string, sessionIds: string[]): Promise<Map<string, number>>;
  insertIfAvailable(enrollment: Enrollment): Promise<InsertOutcome>;
  /** Inserts a new session. Never overwrites an existing (tenantId, id): capacity is not silently changed under enrollments. */
  createSession(session: Session): Promise<CreateSessionOutcome>;
  listEnrollments(tenantId: string, sessionId?: string): Promise<Enrollment[]>;
  listSessionsWithCounts(tenantId: string): Promise<SessionSummary[]>;
  upsertLead(lead: {
    id: string;
    tenantId: string;
    name: string;
    phone: string;
    source: LeadSource;
    stage?: LeadStage;
    note?: string;
    nowIso: string;
  }): Promise<CrmLead>;
  listLeads(tenantId: string): Promise<CrmLead[]>;
  getLead(tenantId: string, leadId: string): Promise<CrmLead | null>;
  updateLead(
    tenantId: string,
    leadId: string,
    patch: { stage?: LeadStage; note?: string; updatedAt: string },
  ): Promise<CrmLead | null>;
  addMessage(msg: InboxMessage): Promise<InboxMessage | null>;
  listMessages(tenantId: string, leadId?: string): Promise<InboxMessage[]>;
}

export type CreateSessionOutcome = "created" | "exists";

/** Mobile operator prefixes: Azercell 10/50/51, Bakcell 55/99, Nar 70/77, Naxtel 60. */
const AZ_MOBILE = /^(10|50|51|55|60|70|77|99)\d{7}$/;

/** Normalizes Azerbaijan mobile numbers to +994XXXXXXXXX. Returns null if invalid. */
export function normalizeAzPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  // Decide by length so a local number that happens to start with 99/994 is not mangled.
  if (d.length === 14 && d.startsWith("00994")) d = d.slice(5);
  else if (d.length === 12 && d.startsWith("994")) d = d.slice(3);
  else if (d.length === 10 && d.startsWith("0")) d = d.slice(1);
  return AZ_MOBILE.test(d) ? `+994${d}` : null;
}

export const MAX_INBOX_MESSAGES = 500;

function compareIsoAsc(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
  return a < b ? -1 : a > b ? 1 : 0;
}

export class InMemoryEnrollmentStore implements EnrollmentStore {
  private sessions = new Map<string, Session>();
  private key = (tenantId: string, id: string) => JSON.stringify([tenantId, id]);
  private enrollments: Enrollment[] = [];
  private leadsById = new Map<string, CrmLead>();
  private leadsByPhone = new Map<string, CrmLead>();
  private messages: InboxMessage[] = [];

  addSession(s: Session) {
    this.sessions.set(this.key(s.tenantId, s.id), s);
  }
  async createSession(s: Session): Promise<CreateSessionOutcome> {
    const k = this.key(s.tenantId, s.id);
    if (this.sessions.has(k)) return "exists";
    this.sessions.set(k, s);
    return "created";
  }
  async getSession(tenantId: string, sessionId: string) {
    return this.sessions.get(this.key(tenantId, sessionId)) ?? null;
  }
  async listSessions(tenantId: string) {
    return [...this.sessions.values()].filter((s) => s.tenantId === tenantId);
  }
  async countBySession(tenantId: string, sessionId: string) {
    return this.enrollments.filter((e) => e.tenantId === tenantId && e.sessionId === sessionId).length;
  }
  async countBySessions(tenantId: string, sessionIds: string[]) {
    const counts = new Map<string, number>();
    for (const id of sessionIds) counts.set(id, 0);
    for (const e of this.enrollments) {
      if (e.tenantId === tenantId && counts.has(e.sessionId)) {
        counts.set(e.sessionId, (counts.get(e.sessionId) ?? 0) + 1);
      }
    }
    return counts;
  }
  // No await between check and push: atomic on the single JS thread.
  async insertIfAvailable(e: Enrollment): Promise<InsertOutcome> {
    const s = this.sessions.get(this.key(e.tenantId, e.sessionId));
    if (!s) return "unknown_session";
    const mine = this.enrollments.filter((x) => x.tenantId === e.tenantId && x.sessionId === e.sessionId);
    if (mine.some((x) => x.phone === e.phone)) return "duplicate";
    if (mine.length >= s.capacity) return "full";
    this.enrollments.push(e);
    return "inserted";
  }

  async listEnrollments(tenantId: string, sessionId?: string): Promise<Enrollment[]> {
    return this.enrollments
      .filter((e) => e.tenantId === tenantId && (sessionId === undefined || e.sessionId === sessionId))
      .map((e) => ({ ...e }))
      .sort((a, b) => compareIsoAsc(b.createdAt, a.createdAt));
  }

  async listSessionsWithCounts(tenantId: string): Promise<SessionSummary[]> {
    const counts = new Map<string, number>();
    for (const e of this.enrollments) {
      if (e.tenantId === tenantId) {
        counts.set(e.sessionId, (counts.get(e.sessionId) ?? 0) + 1);
      }
    }
    return [...this.sessions.values()]
      .filter((s) => s.tenantId === tenantId)
      .sort((a, b) => compareIsoAsc(a.startsAt, b.startsAt))
      .map((s) => {
        const taken = counts.get(s.id) ?? 0;
        return { session: { ...s }, taken, seatsLeft: Math.max(0, s.capacity - taken) };
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
    const pk = this.key(lead.tenantId, lead.phone);
    const existing = this.leadsByPhone.get(pk);
    if (existing) {
      existing.name = lead.name;
      existing.source = lead.source;
      if (lead.stage !== undefined) existing.stage = lead.stage;
      if (lead.note !== undefined && lead.note !== "") {
        existing.note = existing.note === "" ? lead.note : `${existing.note}\n${lead.note}`;
      }
      existing.updatedAt = lead.nowIso;
      return { ...existing };
    }
    const created: CrmLead = {
      id: lead.id,
      tenantId: lead.tenantId,
      name: lead.name,
      phone: lead.phone,
      source: lead.source,
      stage: lead.stage ?? "new",
      note: lead.note ?? "",
      createdAt: lead.nowIso,
      updatedAt: lead.nowIso,
    };
    this.leadsById.set(this.key(lead.tenantId, created.id), created);
    this.leadsByPhone.set(pk, created);
    return { ...created };
  }

  async listLeads(tenantId: string): Promise<CrmLead[]> {
    return [...this.leadsById.values()]
      .filter((l) => l.tenantId === tenantId)
      .map((l) => ({ ...l }))
      .sort((a, b) => compareIsoAsc(b.updatedAt, a.updatedAt));
  }

  async getLead(tenantId: string, leadId: string): Promise<CrmLead | null> {
    const found = this.leadsById.get(this.key(tenantId, leadId));
    return found ? { ...found } : null;
  }

  async updateLead(
    tenantId: string,
    leadId: string,
    patch: { stage?: LeadStage; note?: string; updatedAt: string },
  ): Promise<CrmLead | null> {
    const found = this.leadsById.get(this.key(tenantId, leadId));
    if (!found) return null;
    if (patch.stage !== undefined) found.stage = patch.stage;
    if (patch.note !== undefined) found.note = patch.note;
    found.updatedAt = patch.updatedAt;
    return { ...found };
  }

  async addMessage(msg: InboxMessage): Promise<InboxMessage | null> {
    if (!this.leadsById.has(this.key(msg.tenantId, msg.leadId))) return null;
    const stored: InboxMessage = { ...msg };
    this.messages.push(stored);
    return { ...stored };
  }

  async listMessages(tenantId: string, leadId?: string): Promise<InboxMessage[]> {
    return this.messages
      .filter((m) => m.tenantId === tenantId && (leadId === undefined || m.leadId === leadId))
      .map((m) => ({ ...m }))
      .sort((a, b) => compareIsoAsc(a.createdAt, b.createdAt))
      .slice(0, MAX_INBOX_MESSAGES);
  }
}

export class EnrollmentService {
  constructor(
    private store: EnrollmentStore,
    private now: () => Date = () => new Date(),
  ) {}

  async listSessions(tenantId: string, opts: { onlyAvailable?: boolean } = {}) {
    if (!opts.onlyAvailable) return this.store.listSessions(tenantId);
    const available = await this.listSessionsWithAvailability(tenantId);
    return available.map((entry) => entry.session);
  }

  async listSessionsWithAvailability(tenantId: string): Promise<Array<{ session: Session; seatsLeft: number }>> {
    const all = await this.store.listSessions(tenantId);
    const nowMs = this.now().getTime();
    const upcoming = all.filter((s) => {
      const start = parseInstant(s.startsAt);
      return start !== null && start > nowMs;
    });
    if (upcoming.length === 0) return [];

    const counts = this.store.countBySessions
      ? await this.store.countBySessions(
          tenantId,
          upcoming.map((s) => s.id),
        )
      : new Map<string, number>();

    const out: Array<{ session: Session; seatsLeft: number }> = [];
    for (const s of upcoming) {
      const taken = this.store.countBySessions ? (counts.get(s.id) ?? 0) : await this.store.countBySession(tenantId, s.id);
      const seatsLeft = s.capacity - taken;
      if (seatsLeft > 0) out.push({ session: s, seatsLeft });
    }
    return out;
  }

  async register(tenantId: string, input: RegisterInput): Promise<RegisterResult> {
    const name = validateName(input.name);
    const phone = typeof input.phone === "string" ? normalizeAzPhone(input.phone) : null;
    if (!name || !phone) return { ok: false, reason: "invalid_input" };

    const session = await this.store.getSession(tenantId, input.sessionId);
    if (!session) return { ok: false, reason: "unknown_session" };
    const start = parseInstant(session.startsAt);
    if (start === null) return { ok: false, reason: "unknown_session" }; // fail closed on bad data
    if (start <= this.now().getTime()) return { ok: false, reason: "session_started" };

    const enrollment: Enrollment = {
      id: crypto.randomUUID(),
      tenantId,
      sessionId: input.sessionId,
      name,
      phone,
      createdAt: this.now().toISOString(),
    };
    const outcome = await this.store.insertIfAvailable(enrollment);
    return outcome === "inserted" ? { ok: true, enrollment } : { ok: false, reason: outcome };
  }
}
