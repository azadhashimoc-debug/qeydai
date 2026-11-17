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

export type RegisterResult =
  | { ok: true; enrollment: Enrollment }
  | { ok: false; reason: "invalid_input" | "unknown_session" | "full" | "duplicate" };

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
  insertIfAvailable(enrollment: Enrollment): Promise<InsertOutcome>;
}

/** Normalizes Azerbaijan numbers to +994XXXXXXXXX (9 national digits). Returns null if invalid. */
export function normalizeAzPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("994")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^[1-9]\d{8}$/.test(d) ? `+994${d}` : null;
}

export class InMemoryEnrollmentStore implements EnrollmentStore {
  private sessions = new Map<string, Session>();
  private enrollments: Enrollment[] = [];

  addSession(s: Session) {
    this.sessions.set(`${s.tenantId}:${s.id}`, s);
  }
  async getSession(tenantId: string, sessionId: string) {
    return this.sessions.get(`${tenantId}:${sessionId}`) ?? null;
  }
  async listSessions(tenantId: string) {
    return [...this.sessions.values()].filter((s) => s.tenantId === tenantId);
  }
  async countBySession(tenantId: string, sessionId: string) {
    return this.enrollments.filter((e) => e.tenantId === tenantId && e.sessionId === sessionId).length;
  }
  // No await between check and push: atomic on the single JS thread.
  async insertIfAvailable(e: Enrollment): Promise<InsertOutcome> {
    const s = this.sessions.get(`${e.tenantId}:${e.sessionId}`);
    if (!s) return "unknown_session";
    const mine = this.enrollments.filter((x) => x.tenantId === e.tenantId && x.sessionId === e.sessionId);
    if (mine.some((x) => x.phone === e.phone)) return "duplicate";
    if (mine.length >= s.capacity) return "full";
    this.enrollments.push(e);
    return "inserted";
  }
}

export class EnrollmentService {
  constructor(private store: EnrollmentStore) {}

  async listSessions(tenantId: string, opts: { onlyAvailable?: boolean } = {}) {
    const all = await this.store.listSessions(tenantId);
    if (!opts.onlyAvailable) return all;
    const out: Session[] = [];
    for (const s of all) {
      if ((await this.store.countBySession(tenantId, s.id)) < s.capacity) out.push(s);
    }
    return out;
  }

  async register(tenantId: string, input: RegisterInput): Promise<RegisterResult> {
    const name = input.name?.trim();
    const phone = normalizeAzPhone(input.phone ?? "");
    if (!name || name.length > 100 || !phone) return { ok: false, reason: "invalid_input" };

    const enrollment: Enrollment = {
      id: crypto.randomUUID(),
      tenantId,
      sessionId: input.sessionId,
      name,
      phone,
      createdAt: new Date().toISOString(),
    };
    const outcome = await this.store.insertIfAvailable(enrollment);
    return outcome === "inserted" ? { ok: true, enrollment } : { ok: false, reason: outcome };
  }
}
