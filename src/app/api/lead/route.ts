import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { validateLead } from "@/lib/leads/leads";
import { createRateLimiter } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 2048;
const WINDOW_MS = 10 * 60_000;
const perClient = createRateLimiter({ max: 5, windowMs: WINDOW_MS });
// Backstop against rotating client identities: caps total accepted leads per window.
const global = createRateLimiter({ max: 200, windowMs: WINDOW_MS, maxKeys: 1 });

export const resetLeadRateLimit = () => {
  perClient.clear();
  global.clear();
};

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

/**
 * Client identity for rate limiting. Prefer x-real-ip set by the edge; otherwise use the LAST
 * x-forwarded-for hop (appended by our nearest proxy). Left-most entries are client-controlled
 * and ignored. Without a trusted proxy this is still spoofable, hence the global cap above.
 */
function clientKey(req: Request) {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = req.headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean);
  return hops?.at(-1) ?? "unknown";
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser client; browsers always send Origin on cross-site POST
  const host = req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Local MVP storage: data/leads.jsonl (gitignored). Needs a persistent disk; replaced by PostgreSQL in the SaaS phase.
export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail("unsupported_media_type", 415);
  }
  if (!sameOrigin(req)) return fail("forbidden", 403);

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("payload_too_large", 413);

  if (!perClient.allow(clientKey(req)) || !global.allow("all")) return fail("rate_limited", 429);

  const text = await req.text(); // chunked bodies have no Content-Length, so re-check the real size
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return fail("payload_too_large", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("invalid_input", 400);
  }
  const v = validateLead(body);
  if (!v.ok) return fail("invalid_input", 400);

  try {
    const file = process.env.LEADS_FILE ?? path.join(process.cwd(), "data", "leads.jsonl");
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, JSON.stringify({ ...v.lead, createdAt: new Date().toISOString() }) + "\n", "utf8");
  } catch (err) {
    console.error("lead storage failed:", err instanceof Error ? err.message : "unknown");
    return fail("server_error", 500);
  }
  return Response.json({ ok: true });
}
