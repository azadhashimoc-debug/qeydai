import { DatabaseSync } from "node:sqlite";
import type { Enrollment, EnrollmentStore, InsertOutcome, Session } from "./enrollment";

type SessionRow = { id: string; tenant_id: string; course_id: string; starts_at: string; capacity: number };

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
    `);
    this.db.exec("PRAGMA foreign_keys = ON");
  }

  close() {
    this.db.close();
  }

  addSession(s: Session) {
    this.db
      .prepare("INSERT OR REPLACE INTO sessions (tenant_id, id, course_id, starts_at, capacity) VALUES (?, ?, ?, ?, ?)")
      .run(s.tenantId, s.id, s.courseId, s.startsAt, s.capacity);
  }

  private toSession(r: SessionRow): Session {
    return { id: r.id, tenantId: r.tenant_id, courseId: r.course_id, startsAt: r.starts_at, capacity: r.capacity };
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
}
