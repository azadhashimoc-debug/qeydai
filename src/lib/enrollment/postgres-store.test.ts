import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PostgresEnrollmentStore, type PgClient, type PgPool } from "./postgres-store";

type QueryRecord = { sql: string; params: unknown[] };

function createMockPool(handler: (sql: string, params: unknown[]) => unknown[] | Promise<unknown[]>) {
  const queries: QueryRecord[] = [];
  let released = 0;
  let acquired = 0;

  const client: PgClient & { release: () => void } = {
    async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      const rows = (await handler(sql, params)) as R[];
      return { rows };
    },
    release() {
      released += 1;
    },
  };

  const pool: PgPool = {
    async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      const rows = (await handler(sql, params)) as R[];
      return { rows };
    },
    async connect() {
      acquired += 1;
      return client;
    },
  };

  return { pool, queries, counts: () => ({ acquired, released }) };
}

describe("PostgresEnrollmentStore", () => {
  it("lists sessions and batches counts without N+1 queries", async () => {
    const { pool, queries } = createMockPool((sql) => {
      if (sql.includes("FROM sessions")) {
        return [
          { id: "s1", tenant_id: "t1", course_id: "ielts", starts_at: "2099-01-01T10:00:00Z", capacity: 5 },
          { id: "s2", tenant_id: "t1", course_id: "math", starts_at: "2099-01-02T10:00:00Z", capacity: 3 },
        ];
      }
      if (sql.includes("GROUP BY session_id")) {
        return [{ session_id: "s1", n: 2 }];
      }
      return [];
    });

    const store = new PostgresEnrollmentStore(pool);
    const sessions = await store.listSessions("t1");
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toEqual({
      id: "s1",
      tenantId: "t1",
      courseId: "ielts",
      startsAt: "2099-01-01T10:00:00Z",
      capacity: 5,
    });

    const counts = await store.countBySessions("t1", ["s1", "s2"]);
    expect(counts.get("s1")).toBe(2);
    expect(counts.get("s2")).toBe(0);
    expect(queries.filter((q) => q.sql.includes("GROUP BY session_id"))).toHaveLength(1);
    expect(await store.countBySessions("t1", [])).toEqual(new Map());
  });

  it("uses BEGIN + SELECT ... FOR UPDATE + COMMIT on insertIfAvailable", async () => {
    const { pool, queries, counts } = createMockPool((sql) => {
      if (sql.includes("FOR UPDATE")) return [{ capacity: 2 }];
      if (sql.includes("SELECT 1")) return [];
      if (sql.includes("COUNT(*)")) return [{ n: 1 }];
      return [];
    });

    const store = new PostgresEnrollmentStore(pool);
    const out = await store.insertIfAvailable({
      id: "e1",
      tenantId: "t1",
      sessionId: "s1",
      name: "Aygün",
      phone: "+994501234567",
      createdAt: "2026-11-18T10:00:00Z",
    });

    expect(out).toBe("inserted");
    expect(queries.map((q) => q.sql)).toEqual([
      "BEGIN",
      "SELECT capacity FROM sessions WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
      "SELECT 1 AS x FROM enrollments WHERE tenant_id = $1 AND session_id = $2 AND phone = $3",
      "SELECT COUNT(*)::int AS n FROM enrollments WHERE tenant_id = $1 AND session_id = $2",
      "INSERT INTO enrollments (id, tenant_id, session_id, name, phone, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      "COMMIT",
    ]);
    expect(counts()).toEqual({ acquired: 1, released: 1 });
  });

  it.each<[string, Record<string, unknown>[]]>([
    ["unknown_session", []],
    ["duplicate", [{ x: 1 }]],
    ["full", [{ n: 2 }]],
  ])("rolls back and releases client on %s", async (expected, mockMatch) => {
    const { pool, queries, counts } = createMockPool((sql) => {
      if (sql.includes("FOR UPDATE")) return expected === "unknown_session" ? mockMatch : [{ capacity: 2 }];
      if (sql.includes("SELECT 1")) return expected === "duplicate" ? mockMatch : [];
      if (sql.includes("COUNT(*)")) return expected === "full" ? mockMatch : [{ n: 0 }];
      return [];
    });

    const store = new PostgresEnrollmentStore(pool);
    const out = await store.insertIfAvailable({
      id: "e1",
      tenantId: "t1",
      sessionId: "s1",
      name: "Ali",
      phone: "+994501234567",
      createdAt: "2026-11-18T10:00:00Z",
    });

    expect(out).toBe(expected);
    expect(queries.at(-1)?.sql).toBe("ROLLBACK");
    expect(counts()).toEqual({ acquired: 1, released: 1 });
  });

  it("maps SQLSTATE 23505 unique violation to duplicate and rolls back", async () => {
    const { pool, queries, counts } = createMockPool((sql) => {
      if (sql.includes("FOR UPDATE")) return [{ capacity: 5 }];
      if (sql.includes("SELECT 1")) return [];
      if (sql.includes("COUNT(*)")) return [{ n: 0 }];
      if (sql.includes("INSERT INTO enrollments")) {
        const err = new Error("duplicate key value violates unique constraint") as Error & { code?: string };
        err.code = "23505";
        throw err;
      }
      return [];
    });

    const store = new PostgresEnrollmentStore(pool);
    const out = await store.insertIfAvailable({
      id: "e1",
      tenantId: "t1",
      sessionId: "s1",
      name: "Ali",
      phone: "+994501234567",
      createdAt: "2026-11-18T10:00:00Z",
    });

    expect(out).toBe("duplicate");
    expect(queries.at(-1)?.sql).toBe("ROLLBACK");
    expect(counts()).toEqual({ acquired: 1, released: 1 });
  });

  it.each([
    [[{ id: "s1" }], "created"],
    [[], "exists"],
  ] as Array<[Record<string, unknown>[], string]>)("createSession uses ON CONFLICT DO NOTHING (rows %j -> %s)", async (rows, expected) => {
    const { pool, queries } = createMockPool(() => rows);
    const store = new PostgresEnrollmentStore(pool);
    const out = await store.createSession({ id: "s1", tenantId: "t1", courseId: "ielts", startsAt: "2099-01-01T10:00:00.000Z", capacity: 5 });
    expect(out).toBe(expected);
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toMatch(/INSERT INTO sessions .* ON CONFLICT \(tenant_id, id\) DO NOTHING RETURNING id/);
    expect(queries[0].params).toEqual(["t1", "s1", "ielts", "2099-01-01T10:00:00.000Z", 5]);
  });

  it("always releases client if unexpected error is thrown", async () => {
    const { pool, counts } = createMockPool((sql) => {
      if (sql.includes("FOR UPDATE")) throw new Error("connection lost");
      return [];
    });

    const store = new PostgresEnrollmentStore(pool);
    await expect(
      store.insertIfAvailable({
        id: "e1",
        tenantId: "t1",
        sessionId: "s1",
        name: "Ali",
        phone: "+994501234567",
        createdAt: "2026-11-18T10:00:00Z",
      }),
    ).rejects.toThrow("connection lost");
    expect(counts()).toEqual({ acquired: 1, released: 1 });
  });
});

describe("db/migrations/0001_init.sql", () => {
  it("follows PostgreSQL schema best practices (TIMESTAMPTZ, TEXT, RLS, FK indexes)", () => {
    const sql = readFileSync(path.resolve(process.cwd(), "db/migrations/0001_init.sql"), "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS sessions/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS enrollments/i);
    expect(sql).toMatch(/TIMESTAMPTZ/i);
    expect(sql).not.toMatch(/\bTIMESTAMP\s+(?!WITH TIME ZONE)/i);
    expect(sql).not.toMatch(/\bVARCHAR\s*\(/i);
    expect(sql).not.toMatch(/\bSERIAL\b/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*tenant_id\s*,\s*session_id\s*,\s*phone\s*\)/i);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/CREATE INDEX.*enrollments_tenant_session_idx/i);
  });
});

describe("PostgresEnrollmentStore CRM & Inbox (F4/F2)", () => {
  it("listEnrollments filters by tenantId and optional sessionId, ordered created_at DESC", async () => {
    const { pool, queries } = createMockPool(() => [
      {
        id: "e1",
        tenant_id: "t1",
        session_id: "s1",
        name: "Ali",
        phone: "+994501234567",
        created_at: new Date("2026-11-18T10:00:00Z"),
      },
    ]);
    const store = new PostgresEnrollmentStore(pool);

    const all = await store.listEnrollments("t1");
    expect(all).toEqual([
      {
        id: "e1",
        tenantId: "t1",
        sessionId: "s1",
        name: "Ali",
        phone: "+994501234567",
        createdAt: "2026-11-18T10:00:00.000Z",
      },
    ]);
    expect(queries[0].sql).toMatch(/WHERE tenant_id = \$1 ORDER BY created_at DESC/);
    expect(queries[0].params).toEqual(["t1"]);

    await store.listEnrollments("t1", "s1");
    expect(queries[1].sql).toMatch(/WHERE tenant_id = \$1 AND session_id = \$2 ORDER BY created_at DESC/);
    expect(queries[1].params).toEqual(["t1", "s1"]);
  });

  it("listSessionsWithCounts uses a single LEFT JOIN query and computes seatsLeft", async () => {
    const { pool, queries } = createMockPool(() => [
      { id: "s1", tenant_id: "t1", course_id: "ielts", starts_at: "2026-11-01T10:00:00Z", capacity: 2, taken: 3 },
      { id: "s2", tenant_id: "t1", course_id: "math", starts_at: "2026-12-01T10:00:00Z", capacity: 5, taken: 1 },
    ]);
    const store = new PostgresEnrollmentStore(pool);
    const summaries = await store.listSessionsWithCounts("t1");
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toMatch(/LEFT JOIN enrollments/);
    expect(queries[0].sql).toMatch(/ORDER BY s\.starts_at ASC/);
    expect(summaries).toEqual([
      { session: { id: "s1", tenantId: "t1", courseId: "ielts", startsAt: "2026-11-01T10:00:00Z", capacity: 2 }, taken: 3, seatsLeft: 0 },
      { session: { id: "s2", tenantId: "t1", courseId: "math", startsAt: "2026-12-01T10:00:00Z", capacity: 5 }, taken: 1, seatsLeft: 4 },
    ]);
  });

  it("upsertLead, listLeads, getLead, and updateLead issue parameterized tenant-scoped queries", async () => {
    const leadRow = {
      id: "l1",
      tenant_id: "t1",
      name: "Nigar",
      phone: "+994501234567",
      source: "instagram",
      stage: "new",
      note: "",
      created_at: "2026-11-18T10:00:00Z",
      updated_at: "2026-11-18T10:00:00Z",
    };
    const { pool, queries } = createMockPool((sql) => {
      if (sql.includes("INSERT INTO crm_leads")) return [leadRow];
      if (sql.includes("WHERE tenant_id = $1 ORDER BY updated_at DESC")) return [leadRow];
      if (sql.includes("WHERE tenant_id = $1 AND id = $2")) return [];
      if (sql.includes("UPDATE crm_leads")) return [{ ...leadRow, stage: "paid", note: "Done" }];
      return [];
    });
    const store = new PostgresEnrollmentStore(pool);

    const created = await store.upsertLead({
      id: "l1",
      tenantId: "t1",
      name: "Nigar",
      phone: "+994501234567",
      source: "instagram",
      nowIso: "2026-11-18T10:00:00Z",
    });
    expect(created.stage).toBe("new");
    expect(queries[0].sql).toMatch(/ON CONFLICT \(tenant_id, phone\) DO UPDATE/);
    expect(queries[0].params).toEqual(["l1", "t1", "Nigar", "+994501234567", "instagram", "new", "", "2026-11-18T10:00:00Z", "2026-11-18T10:00:00Z", null]);

    expect(await store.listLeads("t1")).toHaveLength(1);
    expect(await store.getLead("t2", "l1")).toBeNull();
    const patched = await store.updateLead("t1", "l1", { stage: "paid", note: "Done", updatedAt: "2026-11-18T11:00:00Z" });
    expect(patched?.stage).toBe("paid");
    expect(queries[3].params).toEqual(["paid", "Done", "2026-11-18T11:00:00Z", "t1", "l1"]);
  });

  it("addMessage returns null when lead is missing or FK fails (23503), and listMessages caps and orders ASC", async () => {
    const { pool, queries } = createMockPool((sql) => {
      if (sql.includes("INSERT INTO inbox_messages")) return [];
      if (sql.includes("FROM inbox_messages")) {
        return [
          {
            id: "m1",
            tenant_id: "t1",
            lead_id: "l1",
            channel: "telegram",
            direction: "in",
            sender: "student",
            body: "Hi",
            created_at: "2026-11-18T10:00:00Z",
          },
        ];
      }
      return [];
    });
    const store = new PostgresEnrollmentStore(pool);

    expect(
      await store.addMessage({
        id: "m1",
        tenantId: "t2",
        leadId: "l1",
        channel: "telegram",
        direction: "in",
        sender: "student",
        body: "Hi",
        createdAt: "2026-11-18T10:00:00Z",
      }),
    ).toBeNull();
    expect(queries[0].sql).toMatch(/WHERE EXISTS \(SELECT 1 FROM crm_leads WHERE tenant_id = \$2::text AND id = \$3::text\)/);

    const msgs = await store.listMessages("t1", "l1");
    expect(msgs).toHaveLength(1);
    expect(queries[1].sql).toMatch(/ORDER BY created_at ASC LIMIT \$3/);
    expect(queries[1].params).toEqual(["t1", "l1", 500]);
  });

  it("addMessage maps SQLSTATE 23503 foreign key violation to null", async () => {
    const { pool } = createMockPool(() => {
      const err = new Error("violates foreign key constraint") as Error & { code?: string };
      err.code = "23503";
      throw err;
    });
    const store = new PostgresEnrollmentStore(pool);
    expect(
      await store.addMessage({
        id: "m1",
        tenantId: "t1",
        leadId: "missing",
        channel: "web",
        direction: "in",
        sender: "student",
        body: "Hi",
        createdAt: "2026-11-18T10:00:00Z",
      }),
    ).toBeNull();
  });
});

describe("db/migrations/0002_crm_inbox.sql", () => {
  it("follows PostgreSQL schema best practices (TIMESTAMPTZ, TEXT + CHECK, composite FK, indexes, RLS)", () => {
    const sql = readFileSync(path.resolve(process.cwd(), "db/migrations/0002_crm_inbox.sql"), "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS crm_leads/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS inbox_messages/i);
    expect(sql).toMatch(/TIMESTAMPTZ/i);
    expect(sql).not.toMatch(/\bTIMESTAMP\s+(?!WITH TIME ZONE)/i);
    expect(sql).not.toMatch(/\bVARCHAR\s*\(/i);
    expect(sql).not.toMatch(/\bSERIAL\b/i);
    expect(sql).not.toMatch(/\bCREATE TYPE\b.*\bENUM\b/i);
    expect(sql).toMatch(/PRIMARY KEY\s*\(\s*tenant_id\s*,\s*id\s*\)/i);
    expect(sql).toMatch(/UNIQUE\s*\(\s*tenant_id\s*,\s*phone\s*\)/i);
    expect(sql).toMatch(/FOREIGN KEY\s*\(\s*tenant_id\s*,\s*lead_id\s*\)\s*REFERENCES crm_leads\s*\(\s*tenant_id\s*,\s*id\s*\)/i);
    expect(sql).toMatch(/CREATE INDEX.*crm_leads_tenant_updated_idx\s+ON crm_leads\s*\(\s*tenant_id\s*,\s*updated_at DESC\s*\)/i);
    expect(sql).toMatch(
      /CREATE INDEX.*inbox_messages_tenant_lead_created_idx\s+ON inbox_messages\s*\(\s*tenant_id\s*,\s*lead_id\s*,\s*created_at ASC\s*\)/i,
    );
    expect(sql).toMatch(/ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/CREATE POLICY crm_leads_tenant_isolation ON crm_leads/i);
    expect(sql).toMatch(/CREATE POLICY inbox_messages_tenant_isolation ON inbox_messages/i);
  });
});
