import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST, closeAnalyticsPoolForTests, resetAnalyticsRateLimit } from "./route";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const origin = "http://localhost:3000";
const file = path.join(tmpdir(), "panelim-analytics-pg-" + randomUUID() + ".jsonl");

suite("public analytics persists in restricted PostgreSQL", () => {
  let previousFile: string | undefined;

  beforeAll(() => {
    previousFile = process.env.ANALYTICS_FILE;
    process.env.ANALYTICS_FILE = file;
    resetAnalyticsRateLimit();
  });

  afterAll(async () => {
    await closeAnalyticsPoolForTests();
    if (previousFile === undefined) delete process.env.ANALYTICS_FILE;
    else process.env.ANALYTICS_FILE = previousFile;
  });

  it("writes a validated event to PostgreSQL without using the filesystem", async () => {
    const request = new Request(origin + "/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        event: "page_viewed",
        props: { locale: "az", path: "/az" },
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(202);
    expect(existsSync(file)).toBe(false);
  });

  it("grants INSERT on event fields but blocks SELECT, UPDATE and DELETE", async () => {
    const pool = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL, max: 1 });
    try {
      const result = await pool.query<{
        event_insert: boolean; locale_insert: boolean; props_insert: boolean;
        read_table: boolean; update_table: boolean; delete_table: boolean;
      }>([
        "SELECT",
        "has_column_privilege(current_user,'public.analytics_events','event','INSERT') AS event_insert,",
        "has_column_privilege(current_user,'public.analytics_events','locale','INSERT') AS locale_insert,",
        "has_column_privilege(current_user,'public.analytics_events','props','INSERT') AS props_insert,",
        "has_table_privilege(current_user,'public.analytics_events','SELECT') AS read_table,",
        "has_table_privilege(current_user,'public.analytics_events','UPDATE') AS update_table,",
        "has_table_privilege(current_user,'public.analytics_events','DELETE') AS delete_table",
      ].join(" "));
      expect(result.rows[0]).toMatchObject({
        event_insert: true, locale_insert: true, props_insert: true,
        read_table: false, update_table: false, delete_table: false,
      });
    } finally {
      await pool.end();
    }
  });
});
