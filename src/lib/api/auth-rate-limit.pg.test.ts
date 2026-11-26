import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { allowAuthAttempt, type AuthLimit } from "./auth-rate-limit";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
let instanceA: Pool;
let instanceB: Pool;

suite("auth rate limit shared through PostgreSQL", () => {
  beforeAll(() => {
    // Two pools stand in for two serverless instances.
    instanceA = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL });
    instanceB = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL });
  });
  afterAll(async () => {
    await instanceA.end();
    await instanceB.end();
  });

  it("counts attempts across instances and blocks after the limit", async () => {
    const limit: AuthLimit = { name: "test-" + randomUUID(), max: 3, windowMs: 60_000 };
    const subject = "198.51.100.7";
    expect(await allowAuthAttempt(instanceA, limit, subject)).toBe(true);
    expect(await allowAuthAttempt(instanceB, limit, subject)).toBe(true);
    expect(await allowAuthAttempt(instanceA, limit, subject)).toBe(true);
    expect(await allowAuthAttempt(instanceB, limit, subject)).toBe(false);
    expect(await allowAuthAttempt(instanceA, limit, "203.0.113.9")).toBe(true);
  });

  it("starts a fresh window once the previous one expires", async () => {
    const limit: AuthLimit = { name: "test-" + randomUUID(), max: 1, windowMs: 300 };
    expect(await allowAuthAttempt(instanceA, limit, "x")).toBe(true);
    expect(await allowAuthAttempt(instanceB, limit, "x")).toBe(false);
    await new Promise((r) => setTimeout(r, 450));
    expect(await allowAuthAttempt(instanceB, limit, "x")).toBe(true);
  });

  it("never exposes or allows editing another bucket's live counter", async () => {
    const limit: AuthLimit = { name: "test-" + randomUUID(), max: 5, windowMs: 60_000 };
    expect(await allowAuthAttempt(instanceA, limit, "victim")).toBe(true);
    const db = await instanceA.connect();
    try {
      await db.query("BEGIN");
      await db.query("SELECT set_config('app.rate_bucket', $1, true)", ["0".repeat(64)]);
      const visible = await db.query("SELECT bucket FROM auth_rate_limits WHERE reset_at > now()");
      expect(visible.rows).toHaveLength(0);
      const reset = await db.query("DELETE FROM auth_rate_limits WHERE reset_at > now()");
      expect(reset.rowCount).toBe(0);
      await db.query("COMMIT");
    } finally {
      db.release();
    }
  });
});
