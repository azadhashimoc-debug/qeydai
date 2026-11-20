import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { validateAnalyticsEvent } from "@/lib/analytics/events";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey } from "@/lib/http/same-origin";

const MAX_BODY_BYTES = 1024;
const WINDOW_MS = 60_000;
const perClient = createRateLimiter({ max: 240, windowMs: WINDOW_MS });
const global = createRateLimiter({ max: 2000, windowMs: WINDOW_MS, maxKeys: 1 });

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

  try {
    const file = process.env.ANALYTICS_FILE ?? path.join(process.cwd(), "data", "analytics.jsonl");
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, JSON.stringify({ ...v.value, ts: new Date().toISOString() }) + "\n", "utf8");
  } catch (err) {
    console.error("analytics storage failed:", err instanceof Error ? err.message : "unknown");
    return fail("server_error", 500);
  }

  return Response.json({ ok: true }, { status: 202, headers: { "cache-control": "no-store" } });
}
