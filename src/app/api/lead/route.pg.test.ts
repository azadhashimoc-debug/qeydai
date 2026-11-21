import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST, resetLeadRateLimit } from "./route";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const tenant = "pg_public_" + randomUUID().slice(0, 20);
const anotherTenant = "pg_other_" + randomUUID().slice(0, 20);
const file = path.join(mkdtempSync(path.join(tmpdir(), "public-lead-pg-")), "should-not-exist.jsonl");
const origin = "http://localhost:3000";
const good = { name: "Aygün", phone: "050 123 45 67" };

suite("public lead route persists with application PostgreSQL and tenant RLS", () => {
  let pool: Pool;
  let oldTenant: string | undefined;
  let oldFile: string | undefined;

  const submit = (body: unknown) => POST(new Request(origin + "/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  }));

  async function queryFor<R extends Record<string, unknown> = { total: number }>(tenantId: string, sql: string, params: unknown[] = []) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      const result = await client.query<R>(sql, params);
      await client.query("COMMIT");
      return result.rows;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL, max: 2 });
    oldTenant = process.env.QEYDAI_PUBLIC_LEAD_TENANT;
    oldFile = process.env.LEADS_FILE;
    process.env.QEYDAI_PUBLIC_LEAD_TENANT = tenant;
    process.env.LEADS_FILE = file;
    resetLeadRateLimit();
  });

  afterAll(async () => {
    if (pool) {
      await queryFor(tenant, "DELETE FROM crm_leads WHERE tenant_id=$1", [tenant]);
      await pool.end();
    }
    if (oldTenant === undefined) delete process.env.QEYDAI_PUBLIC_LEAD_TENANT;
    else process.env.QEYDAI_PUBLIC_LEAD_TENANT = oldTenant;
    if (oldFile === undefined) delete process.env.LEADS_FILE;
    else process.env.LEADS_FILE = oldFile;
  });

  it("writes to PostgreSQL, not a JSONL file, and upserts repeated lead phones", async () => {
    expect((await submit(good)).status).toBe(200);
    expect((await submit({ ...good, name: "Aygün updated" })).status).toBe(200);
    const rows = await queryFor<{ total: number; name: string }>(tenant,
      "SELECT COUNT(*)::int AS total,MAX(name) AS name FROM crm_leads WHERE tenant_id=$1", [tenant]);
    expect(rows[0]).toMatchObject({ total: 1, name: "Aygün updated" });
    expect(existsSync(file)).toBe(false);
  });

  it("cannot read another tenant's records even when querying their explicit tenant_id", async () => {
    const rows = await queryFor(anotherTenant,
      "SELECT COUNT(*)::int AS total FROM crm_leads WHERE tenant_id=$1", [tenant]);
    expect(rows[0].total).toBe(0);
  });
});
