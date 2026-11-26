import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { getSharedPgPool } from "../db/pool";
import { assertSafeApplicationRole } from "../enrollment/postgres-store";
import { createRateLimiter } from "../rate-limit";

export type DistributedLimit = {
  name: string;
  max: number;
  windowMs: number;
};

type MemoryEntry = {
  max: number;
  windowMs: number;
  limiter: ReturnType<typeof createRateLimiter>;
};

const memoryLimiters = new Map<string, MemoryEntry>();
let warnedPgFallback = false;

export function rateLimitBucket(limit: DistributedLimit, subject: string): string {
  return createHash("sha256").update(limit.name + "\u0000" + subject).digest("hex");
}

function getMemoryLimiter(limit: DistributedLimit) {
  const existing = memoryLimiters.get(limit.name);
  if (existing && existing.max === limit.max && existing.windowMs === limit.windowMs) {
    return existing.limiter;
  }
  const limiter = createRateLimiter({
    max: limit.max,
    windowMs: limit.windowMs,
    evictOnFull: true,
  });
  memoryLimiters.set(limit.name, { max: limit.max, windowMs: limit.windowMs, limiter });
  return limiter;
}

export function resetDistributedRateLimitsForTests(prefix?: string): void {
  for (const [name, entry] of memoryLimiters) {
    if (!prefix || name.startsWith(prefix)) {
      entry.limiter.clear();
    }
  }
}

function resolvePool(poolOverride?: Pool | null): Pool | null {
  if (poolOverride !== undefined) return poolOverride;
  if (process.env.QEYDAI_FORCE_SQLITE === "1" || !process.env.QEYDAI_DATABASE_URL) return null;
  return getSharedPgPool();
}

/**
 * Shared fixed-window counter backed by PostgreSQL `auth_rate_limits` (migration 0007)
 * so all serverless instances enforce the same quota. Falls back cleanly to per-process
 * memory when PostgreSQL is unconfigured (dev/SQLite tests) or temporarily unavailable.
 */
export async function allowDistributedLimit(
  limit: DistributedLimit,
  subject: string,
  poolOverride?: Pool | null,
): Promise<boolean> {
  const bucket = rateLimitBucket(limit, subject);
  const pool = resolvePool(poolOverride);
  if (!pool) {
    return getMemoryLimiter(limit).allow(bucket);
  }

  let db;
  try {
    db = await pool.connect();
  } catch {
    return getMemoryLimiter(limit).allow(bucket);
  }

  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.rate_bucket', $1, true)", [bucket]);
    const result = await db.query<{ count: number }>(
      `INSERT INTO auth_rate_limits (bucket, count, reset_at)
       VALUES ($1, 1, now() + make_interval(secs => $2::double precision / 1000))
       ON CONFLICT (bucket) DO UPDATE SET
         count = CASE WHEN auth_rate_limits.reset_at <= now() THEN 1 ELSE auth_rate_limits.count + 1 END,
         reset_at = CASE WHEN auth_rate_limits.reset_at <= now() THEN EXCLUDED.reset_at
                         ELSE auth_rate_limits.reset_at END
       RETURNING count`,
      [bucket, limit.windowMs],
    );
    if (Math.random() < 0.01) {
      await db.query("DELETE FROM auth_rate_limits WHERE reset_at < now() - interval '1 hour'");
    }
    await db.query("COMMIT");
    return Number(result.rows[0]?.count ?? Infinity) <= limit.max;
  } catch {
    await db.query("ROLLBACK").catch(() => {});
    if (!warnedPgFallback) {
      warnedPgFallback = true;
      console.error("auth_rate_limits unavailable; using per-instance rate limit (apply migration 0007)");
    }
    return getMemoryLimiter(limit).allow(bucket);
  } finally {
    db.release();
  }
}

/**
 * Non-consuming check against the same PostgreSQL bucket so pre-validation guards
 * (like global backstops on /api/lead and /api/analytics) do not burn quota on invalid bodies.
 */
export async function isDistributedLimited(
  limit: DistributedLimit,
  subject: string,
  poolOverride?: Pool | null,
): Promise<boolean> {
  const bucket = rateLimitBucket(limit, subject);
  const pool = resolvePool(poolOverride);
  if (!pool) {
    return getMemoryLimiter(limit).isLimited(bucket);
  }

  let db;
  try {
    db = await pool.connect();
  } catch {
    return getMemoryLimiter(limit).isLimited(bucket);
  }

  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.rate_bucket', $1, true)", [bucket]);
    const result = await db.query<{ count: number }>(
      "SELECT count FROM auth_rate_limits WHERE bucket = $1 AND reset_at > now()",
      [bucket],
    );
    await db.query("COMMIT");
    const count = Number(result.rows[0]?.count ?? 0);
    return count >= limit.max;
  } catch {
    await db.query("ROLLBACK").catch(() => {});
    return getMemoryLimiter(limit).isLimited(bucket);
  } finally {
    db.release();
  }
}
