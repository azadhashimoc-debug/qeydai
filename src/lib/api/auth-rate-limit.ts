import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { assertSafeApplicationRole } from "../enrollment/postgres-store";
import { createRateLimiter } from "../rate-limit";

export type AuthLimit = { name: string; max: number; windowMs: number };

export const REGISTER_PER_IP: AuthLimit = { name: "register-ip", max: 20, windowMs: 10 * 60_000 };
export const LOGIN_PER_IP: AuthLimit = { name: "login-ip", max: 30, windowMs: 60_000 };
export const LOGIN_PER_EMAIL: AuthLimit = { name: "login-email", max: 10, windowMs: 15 * 60_000 };

const fallbacks = new Map<string, ReturnType<typeof createRateLimiter>>();
let warnedFallback = false;

function bucketFor(limit: AuthLimit, subject: string): string {
  return createHash("sha256").update(limit.name + "\u0000" + subject).digest("hex");
}

function memoryAllow(limit: AuthLimit, bucket: string): boolean {
  let limiter = fallbacks.get(limit.name);
  if (!limiter) {
    limiter = createRateLimiter({ max: limit.max, windowMs: limit.windowMs, evictOnFull: true });
    fallbacks.set(limit.name, limiter);
  }
  return limiter.allow(bucket);
}

/** Client IP as set by the hosting edge (Vercel overwrites x-forwarded-for). */
export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip")?.trim()
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

/**
 * Shared fixed-window limit stored in PostgreSQL so every serverless instance sees the same count.
 * Falls back to a per-process limiter only if the counter table is unavailable (e.g. migration 0007
 * not yet applied), and logs that once so the gap is visible.
 */
export async function allowAuthAttempt(pool: Pool, limit: AuthLimit, subject: string): Promise<boolean> {
  const bucket = bucketFor(limit, subject);
  let db;
  try {
    db = await pool.connect();
  } catch {
    return memoryAllow(limit, bucket);
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
    if (!warnedFallback) {
      warnedFallback = true;
      console.error("auth_rate_limits unavailable; using per-instance auth rate limit (apply migration 0007)");
    }
    return memoryAllow(limit, bucket);
  } finally {
    db.release();
  }
}
