import { Pool } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const WEAK_SSL_MODES = new Set(["require", "prefer", "allow"]);

/**
 * Upgrades weak sslmode values (such as sslmode=require, which pg v9+ treats as
 * weaker than verify-full and logs deprecation warnings for) to sslmode=verify-full
 * on remote PostgreSQL hosts (e.g. Neon). Leaves localhost and explicit disable/verify-* intact.
 */
export function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (LOCAL_HOSTS.has(host)) return trimmed;
    const mode = parsed.searchParams.get("sslmode")?.toLowerCase();
    if (mode && WEAK_SSL_MODES.has(mode)) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

let sharedPool: Pool | null = null;
let sharedPoolKey: string | null = null;

/**
 * Returns the process-wide shared PostgreSQL pool so enrollment, CRM, account auth,
 * analytics, and rate-limit helpers share a single bounded connection budget.
 */
export function getSharedPgPool(
  rawUrl: string | undefined = process.env.QEYDAI_DATABASE_URL,
): Pool {
  const normalized = normalizeDatabaseUrl(rawUrl ?? "");
  if (sharedPool && sharedPoolKey === normalized) {
    return sharedPool;
  }
  const max = Number(process.env.QEYDAI_PG_POOL_MAX ?? 10);
  sharedPool = new Pool({
    connectionString: normalized || undefined,
    max: Number.isFinite(max) && max > 0 ? max : 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });
  sharedPoolKey = normalized;
  return sharedPool;
}

export function setSharedPgPoolForTesting(pool: Pool | null, key?: string): void {
  sharedPool = pool;
  sharedPoolKey = pool ? (key ?? normalizeDatabaseUrl(process.env.QEYDAI_DATABASE_URL ?? "")) : null;
}

export async function closeSharedPgPool(): Promise<void> {
  const pool = sharedPool;
  sharedPool = null;
  sharedPoolKey = null;
  if (pool) await pool.end();
}
