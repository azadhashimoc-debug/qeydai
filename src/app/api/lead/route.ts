import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getApplicationEnrollmentStore, parseKeys } from "@/lib/api/instance";
import {
  allowDistributedLimit,
  isDistributedLimited,
  resetDistributedRateLimitsForTests,
  type DistributedLimit,
} from "@/lib/api/pg-rate-limit";
import {
  listWorkspaceTelegramChatIds,
  syncPublicLeadToWorkspaceDeal,
} from "@/lib/crm/notifications-store";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { clientKey, isUnknownClient, sameOrigin } from "@/lib/http/same-origin";
import { validateLead } from "@/lib/leads/leads";
import { notifyNewDemoLead } from "@/lib/notifications/telegram";
import { reportServerError } from "@/lib/observability/alerts";

const MAX_BODY_BYTES = 2048;
const WINDOW_MS = 10 * 60_000;
const perClientMax = Number(process.env.QEYDAI_LEAD_RATE_MAX ?? 5);
const globalMax = Number(process.env.QEYDAI_LEAD_RATE_GLOBAL_MAX ?? 200);
const PER_CLIENT_LIMIT: DistributedLimit = { name: "lead-client", max: perClientMax, windowMs: WINDOW_MS };
// Backstop against rotating client identities: caps total accepted leads per window across all instances.
const GLOBAL_LIMIT: DistributedLimit = { name: "lead-global", max: globalMax, windowMs: WINDOW_MS };

/**
 * E2E runner submits independent forms from the same localhost IP. Give each
 * verified local test an isolated *client* quota without raising/deleting
 * either production rate limit. Only enabled on the explicitly opted-in
 * localhost Playwright server; a caller cannot spoof this in production.
 */
function leadClientKey(req: Request) {
  const url = new URL(req.url);
  if (process.env.QEYDAI_E2E_SQLITE === "1" &&
      !process.env.VERCEL &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    const testClient = req.headers.get("x-qeydai-e2e-client");
    if (testClient && /^[a-zA-Z0-9_-]{8,100}$/.test(testClient)) {
      return `e2e:${testClient}`;
    }
  }
  return clientKey(req);
}

export const resetLeadRateLimit = () => {
  resetDistributedRateLimitsForTests("lead-");
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

// Production leads persist in tenant-scoped PostgreSQL; local JSONL remains test/dev-only.
export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail("unsupported_media_type", 415);
  }
  if (!sameOrigin(req)) return fail("forbidden", 403);

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail("payload_too_large", 413);

  // Without a trusted client identity every caller would share one 5/10min bucket, so one
  // visitor could block the form for everyone; the global backstop still caps the total.
  const leadClient = leadClientKey(req);
  if (
    (await isDistributedLimited(GLOBAL_LIMIT, "all")) ||
    (!isUnknownClient(leadClient) && !(await allowDistributedLimit(PER_CLIENT_LIMIT, leadClient)))
  ) {
    return fail("rate_limited", 429);
  }

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
  if (!(await allowDistributedLimit(GLOBAL_LIMIT, "all"))) return fail("rate_limited", 429);

  const store = getApplicationEnrollmentStore();
  if (!store) return fail("database_unavailable", 503);

  const createdAt = new Date().toISOString();
  const tenantId = resolvePublicLeadTenant();
  // Keep historical local test/dev JSONL output only when PostgreSQL is not configured.
  if (!process.env.QEYDAI_DATABASE_URL) {
    try {
      const file = process.env.LEADS_FILE ?? path.join(process.cwd(), "data", "leads.jsonl");
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, JSON.stringify({ ...v.lead, createdAt }) + "\n", "utf8");
    } catch (err) {
      void reportServerError("api.lead.jsonl_write", err, { tenantId });
      return fail("server_error", 500);
    }
  }

  try {
    await store.upsertLead({
      id: `lead_${randomUUID()}`,
      tenantId,
      name: v.lead.name,
      phone: v.lead.phone,
      source: "web",
      stage: "new",
      nowIso: createdAt,
    });
  } catch (err) {
    void reportServerError("api.lead.crm_sync", err, { tenantId });
    return fail("server_error", 500);
  }

  // Mirror into the modern sales_contacts + sales_deals board and notify via Telegram (best-effort).
  try {
    await syncPublicLeadToWorkspaceDeal({
      tenantId,
      name: v.lead.name,
      phone: v.lead.phone,
      nowIso: createdAt,
    });
    const extraChatIds = await listWorkspaceTelegramChatIds(tenantId);
    await notifyNewDemoLead({
      tenantId,
      name: v.lead.name,
      phone: v.lead.phone,
      createdAt,
      extraChatIds,
    });
  } catch (err) {
    void reportServerError("api.lead.notify", err, { tenantId });
  }

  return Response.json({ ok: true }, { headers: noStore });
}
