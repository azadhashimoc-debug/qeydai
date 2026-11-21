import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { validateAnalyticsEvent } from "@/lib/analytics/events";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey } from "@/lib/http/same-origin";

const MAX_BODY_BYTES = 1024;
const WINDOW_MS = 60_000;
const perClient = createRateLimiter({ max: 240, windowMs: WINDOW_MS });
const global = createRateLimiter({ max: 2000, windowMs: WINDOW_MS, maxKeys: 1 });

let analyticsPool: Pool | null = null;

// Open the connection lazily: builds and statically rendered pages must not connect.
function getAnalyticsPool(): Pool {
  if (!analyticsPool) {
    analyticsPool = new Pool({
      connectionString: process.env.QEYDAI_DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 5000,
    });
  }
  return analyticsPool;
}

/** Only for integration test cleanup. Do not call in request handlers. */
export async function closeAnalyticsPoolForTests(): Promise<void> {
  const pool = analyticsPool;
  analyticsPool = null;
  if (pool) await pool.end();
}

export const resetAnalyticsRateLimit = () => {
  perClient.clear();
  global.clear();
};

const fail = (error: string, status: number) =>
  Response.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });

function localClientKey(req: Request) {
  return clientKey(req);
}

function sameOrigin(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail("unsupported_media_type", 415);
  }
  if (!sameOrigin(req)) return fail("forbidden", 403);

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("payload_too_large", 413);

  if (global.isLimited("all") || !perClient.allow(localClientKey(req))) return fail("rate_limited", 429);

  const text = await readLimitedUtf8(req, MAX_BODY_BYTES);
  if (text === null) return fail("payload_too_large", 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("invalid_json", 400);
  }

  const v = validateAnalyticsEvent(body);
  if (!v.ok) return fail("invalid_event", 422);
  if (!global.allow("all")) return fail("rate_limited", 429);

  if (process.env.QEYDAI_DATABASE_URL) {
    // Public marketing events are append-only, and the application role has
    // column-level INSERT access only (no SELECT, UPDATE or DELETE).
    try {
      const props = v.value.props;
      const locale = "locale" in props ? props.locale : props.to_locale;
      await getAnalyticsPool().query(
        "INSERT INTO public.analytics_events (event, locale, props) VALUES ($1, $2, $3::jsonb)",
        [v.value.event, locale, JSON.stringify(props)]
      );
    } catch (err) {
      console.error("analytics PostgreSQL storage failed:", err instanceof Error ? err.message : "unknown");
      return fail("server_error", 500);
    }
  } else if (process.env.VERCEL || (process.env.NODE_ENV === "production" && process.env.QEYDAI_E2E_SQLITE !== "1")) {
    // Fail closed on Vercel: serverless filesystem is read-only and ephemeral.
    return fail("database_unavailable", 503);
  } else {
    // Explicit local/dev and disposable Playwright tests only.
    try {
      const file = process.env.ANALYTICS_FILE ?? path.join(process.cwd(), "data", "analytics.jsonl");
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, JSON.stringify({ ...v.value, ts: new Date().toISOString() }) + "\n", "utf8");
    } catch (err) {
      console.error("analytics storage failed:", err instanceof Error ? err.message : "unknown");
      return fail("server_error", 500);
    }
  }

  return Response.json({ ok: true }, { status: 202, headers: { "cache-control": "no-store" } });
}
