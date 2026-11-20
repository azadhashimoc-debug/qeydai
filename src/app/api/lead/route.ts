import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getSharedStore, parseKeys } from "@/lib/api/instance";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { validateLead } from "@/lib/leads/leads";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, sameOrigin } from "@/lib/http/same-origin";

const MAX_BODY_BYTES = 2048;
const WINDOW_MS = 10 * 60_000;
const perClient = createRateLimiter({ max: 5, windowMs: WINDOW_MS });
// Backstop against rotating client identities: caps total accepted leads per window.
const global = createRateLimiter({ max: 200, windowMs: WINDOW_MS });

export const resetLeadRateLimit = () => {
  perClient.clear();
  global.clear();
};

export function resolvePublicLeadTenant(): string {
  const explicit = process.env.QEYDAI_PUBLIC_LEAD_TENANT?.trim();
  if (explicit) return explicit;
  const adminTenants = Object.values(parseKeys(process.env.QEYDAI_ADMIN_KEYS, "QEYDAI_ADMIN_KEYS"));
  if (adminTenants[0]) return adminTenants[0];
  const apiTenants = Object.values(parseKeys(process.env.QEYDAI_API_KEYS, "QEYDAI_API_KEYS"));
  if (apiTenants[0]) return apiTenants[0];
  return "center_001";
}

const noStore = { "cache-control": "no-store" } as const;
const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status, headers: noStore });

// Local MVP storage: data/leads.jsonl (gitignored) + shared SQLite CRM store so leads appear in panel.
export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail("unsupported_media_type", 415);
  }
  if (!sameOrigin(req)) return fail("forbidden", 403);

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("payload_too_large", 413);

  if (global.isLimited("all") || !perClient.allow(clientKey(req))) return fail("rate_limited", 429);

  const text = await readLimitedUtf8(req, MAX_BODY_BYTES);
  if (text === null) return fail("payload_too_large", 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("invalid_input", 400);
  }
  const v = validateLead(body);
  if (!v.ok) return fail("invalid_input", 400);
  if (!global.allow("all")) return fail("rate_limited", 429);

  const createdAt = new Date().toISOString();
  try {
    const file = process.env.LEADS_FILE ?? path.join(process.cwd(), "data", "leads.jsonl");
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, JSON.stringify({ ...v.lead, createdAt }) + "\n", "utf8");
  } catch (err) {
    console.error("lead storage failed:", err instanceof Error ? err.message : "unknown");
    return fail("server_error", 500);
  }

  if (process.env.NEXT_PHASE !== "phase-production-build") {
    try {
      const store = getSharedStore();
      await store.upsertLead({
        id: `lead_${randomUUID()}`,
        tenantId: resolvePublicLeadTenant(),
        name: v.lead.name,
        phone: v.lead.phone,
        source: "web",
        stage: "new",
        nowIso: createdAt,
      });
    } catch (err) {
      console.error("lead crm sync failed:", err instanceof Error ? err.message : "unknown");
      return fail("server_error", 500);
    }
  }
  return Response.json({ ok: true }, { headers: noStore });
}
