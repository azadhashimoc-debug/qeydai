import { afterEach, describe, expect, it } from "vitest";

process.env.QEYDAI_DATABASE_URL = "postgresql://t:t@localhost:5432/test";
import { ingestMessage, setPoolForTesting } from "./store";

type QueryRecord = { sql: string; params: unknown[] };

function createMockPool(handler: (sql: string, params: unknown[]) => unknown[] | Promise<unknown[]>) {
  const queries: QueryRecord[] = [];
  const client: {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
    release: () => void;
  } = {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      const rows = (await handler(sql, params)) as unknown[];
      return { rows, rowCount: rows.length };
    },
    release() {},
  };
  const pool = { connect: async () => client };
  setPoolForTesting(pool as never);
  return { queries };
}

describe("ingestMessage", () => {
  it("inserts sales_messages with 7 placeholders for 7 bound params", async () => {
    const { queries } = createMockPool((sql) => {
      if (sql.includes("FROM sales_connections")) return [{ active: true }];
      if (sql.includes("FROM sales_deals d")) return [{ id: "d1" }];
      if (sql.includes("INSERT INTO sales_contacts")) return [{ id: "c1" }];
      return [];
    });

    await ingestMessage("t1", {
      channel: "whatsapp",
      account: "501234567",
      event: "evt-1",
      sender: "501234567",
      name: "Nami",
      text: "salam",
    });

    const insert = queries.find((q) => q.sql.includes("INSERT INTO sales_messages"));
    expect(insert).toBeDefined();
    const placeholders = insert!.sql.match(/\$\d+/g);
    expect(placeholders).toHaveLength(7);
    expect(insert!.params).toHaveLength(7);
  });

  it("creates new deal in 'new' stage when no open deal exists", async () => {
    const { queries } = createMockPool((sql) => {
      if (sql.includes("FROM sales_connections")) return [{ active: true }];
      if (sql.includes("INSERT INTO sales_contacts")) return [{ id: "c1" }];
      return [];
    });

    await ingestMessage("t1", {
      channel: "whatsapp",
      account: "501234567",
      event: "evt-2",
      sender: "501234567",
      name: "Nami",
      text: "salam",
    });

    const dealInsert = queries.find((q) => q.sql.includes("INSERT INTO sales_deals"));
    expect(dealInsert).toBeDefined();
    expect(dealInsert!.sql).toContain("kind='open' ORDER BY position,id LIMIT 1");
    expect(dealInsert!.params[3]).toBe("Nami");
    expect(dealInsert!.params[4]).toBe("whatsapp");
  });

  it("flags unconfirmed phone match for new contact", async () => {
    const { queries } = createMockPool((sql) => {
      if (sql.includes("FROM sales_connections")) return [{ active: true }];
      if (sql.includes("INSERT INTO sales_contacts")) return [{ id: "c1" }];
      return [];
    });

    await ingestMessage("t1", {
      channel: "whatsapp",
      account: "501234567",
      event: "evt-3",
      sender: "501234567",
      name: "Nami",
      text: "salam",
    });

    const matchInsert = queries.find((q) => q.sql.includes("INSERT INTO sales_phone_matches"));
    expect(matchInsert).toBeDefined();
    expect(matchInsert!.sql).toContain("VALUES ($1,$2,$3,$4,$5,$6,false)");
    expect(matchInsert!.params[5]).toBe("501234567");
  });

  it("dedupes by provider_event_id", async () => {
    const calls: unknown[][] = [];
    let seenCount = 0;
    const handler = (sql: string, params: unknown[]) => {
      calls.push(params);
      if (sql.includes("FROM sales_connections")) return [{ active: true }];
      if (sql.includes("SELECT 1 FROM sales_messages")) {
        seenCount += 1;
        return seenCount > 1 ? [{ x: 1 }] : [];
      }
      if (sql.includes("INSERT INTO sales_contacts")) return [{ id: "c1" }];
      return [];
    };
    createMockPool(handler);

    const first = await ingestMessage("t1", {
      channel: "whatsapp",
      account: "501234567",
      event: "evt-4",
      sender: "501234567",
      name: "Nami",
      text: "salam",
    });
    expect(first).toBe(true);

    const second = await ingestMessage("t1", {
      channel: "whatsapp",
      account: "501234567",
      event: "evt-4",
      sender: "501234567",
      name: "Nami",
      text: "salam",
    });
    expect(second).toBe(false);
  });

  afterEach(() => setPoolForTesting(undefined));
});
