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
  insertIfAvailable(enrollment: Enrollment): Promise<InsertOutcome>;
}

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

export class InMemoryEnrollmentStore implements EnrollmentStore {
  private sessions = new Map<string, Session>();
  private key = (tenantId: string, id: string) => JSON.stringify([tenantId, id]);
  private enrollments: Enrollment[] = [];

  addSession(s: Session) {
    this.sessions.set(this.key(s.tenantId, s.id), s);
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
}

export class EnrollmentService {
  constructor(
    private store: EnrollmentStore,
    private now: () => Date = () => new Date(),
  ) {}

  async listSessions(tenantId: string, opts: { onlyAvailable?: boolean } = {}) {
    const all = await this.store.listSessions(tenantId);
    if (!opts.onlyAvailable) return all;
    const nowMs = this.now().getTime();
    const out: Session[] = [];
    for (const s of all) {
      const start = parseInstant(s.startsAt);
      if (start === null || start <= nowMs) continue;
      if ((await this.store.countBySession(tenantId, s.id)) < s.capacity) out.push(s);
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
