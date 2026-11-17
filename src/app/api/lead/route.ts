import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { validateLead } from "@/lib/leads/leads";
import { createRateLimiter } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 2048;
const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000 });

export const resetLeadRateLimit = () => limiter.clear();

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

function clientKey(req: Request) {
  // Behind a trusted proxy the first hop is the client. Without one this header is spoofable,
  // so the limiter is a speed bump, not a security boundary.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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

// Local MVP storage: data/leads.jsonl (gitignored). Replaced by PostgreSQL in the SaaS phase.
export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail("unsupported_media_type", 415);
  }
  if (!sameOrigin(req)) return fail("forbidden", 403);
  if (!limiter.allow(clientKey(req))) return fail("rate_limited", 429);

  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return fail("payload_too_large", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("invalid_input", 400);
  }
  const v = validateLead(body);
  if (!v.ok) return fail("invalid_input", 400);

  const file = process.env.LEADS_FILE ?? path.join(process.cwd(), "data", "leads.jsonl");
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, JSON.stringify({ ...v.lead, createdAt: new Date().toISOString() }) + "\n", "utf8");
  return Response.json({ ok: true });
}
