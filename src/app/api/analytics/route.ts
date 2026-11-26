import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { validateAnalyticsEvent } from "@/lib/analytics/events";
import {
  allowDistributedLimit,
  isDistributedLimited,
  resetDistributedRateLimitsForTests,
  type DistributedLimit,
} from "@/lib/api/pg-rate-limit";
import { closeSharedPgPool, getSharedPgPool } from "@/lib/db/pool";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { clientKey, isUnknownClient, sameOrigin } from "@/lib/http/same-origin";
import { reportServerError } from "@/lib/observability/alerts";

const MAX_BODY_BYTES = 1024;
const WINDOW_MS = 60_000;
const PER_CLIENT_LIMIT: DistributedLimit = { name: "analytics-client", max: 240, windowMs: WINDOW_MS };
// Shared cross-instance backstop against rotating or unknown client identities.
const GLOBAL_LIMIT: DistributedLimit = { name: "analytics-global", max: 2000, windowMs: WINDOW_MS };

/** Only for integration test cleanup. Do not call in request handlers. */
export async function closeAnalyticsPoolForTests(): Promise<void> {
  await closeSharedPgPool();
}

export const resetAnalyticsRateLimit = () => {
  resetDistributedRateLimitsForTests("analytics-");
};

const fail = (error: string, status: number) =>
  Response.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail("unsupported_media_type", 415);
  }
  if (!sameOrigin(req)) return fail("forbidden", 403);

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("payload_too_large", 413);

  const client = clientKey(req);
  if (
    (await isDistributedLimited(GLOBAL_LIMIT, "all")) ||
    (!isUnknownClient(client) && !(await allowDistributedLimit(PER_CLIENT_LIMIT, client)))
  ) {
    return fail("rate_limited", 429);
  }

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
  if (!(await allowDistributedLimit(GLOBAL_LIMIT, "all"))) return fail("rate_limited", 429);

  if (process.env.QEYDAI_DATABASE_URL) {
    // Public marketing events are append-only, and the application role has
    // column-level INSERT access only (no SELECT, UPDATE or DELETE).
    try {
      const props = v.value.props;
      const locale = "locale" in props ? props.locale : props.to_locale;
      await getSharedPgPool().query(
        "INSERT INTO public.analytics_events (event, locale, props) VALUES ($1, $2, $3::jsonb)",
        [v.value.event, locale, JSON.stringify(props)],
      );
    } catch (err) {
      void reportServerError("api.analytics.postgres", err);
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
      void reportServerError("api.analytics.jsonl", err);
      return fail("server_error", 500);
    }
  }

  return Response.json({ ok: true }, { status: 202, headers: { "cache-control": "no-store" } });
}
