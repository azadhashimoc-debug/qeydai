import { applyPaycellEventToWorkspace } from "@/lib/billing/entitlements";
import { parsePaycellEvent, PAYCELL_PRICES_AZN, verifyPaycellSignature } from "@/lib/billing/paycell";
import { databaseConfigured, workspaceTransaction } from "@/lib/crm/store";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { reportServerError } from "@/lib/observability/alerts";

const MAX_BODY = 64 * 1024;

export async function POST(req: Request) {
  const secret = process.env.QEYDAI_PAYCELL_WEBHOOK_SECRET ?? "";
  if (!secret || !databaseConfigured()) return new Response(null, { status: 503 });
  const raw = await readLimitedUtf8(req, MAX_BODY);
  if (raw === null) return new Response(null, { status: 413 });
  if (!verifyPaycellSignature(Buffer.from(raw), req.headers.get("x-paycell-signature") ?? "", secret)) {
    return new Response(null, { status: 403 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const event = parsePaycellEvent(body);
  if (!event) return new Response(null, { status: 422 });
  if (
    event.status === "paid" &&
    event.plan !== "enterprise" &&
    event.amount !== PAYCELL_PRICES_AZN[event.plan][event.period]
  ) {
    return new Response(null, { status: 422 });
  }
  try {
    const stored = await workspaceTransaction(event.tenant, async (db) => {
      const ws = await db.query("SELECT id FROM sales_workspaces WHERE id = $1", [event.tenant]);
      if (ws.rows.length === 0) return "unknown_tenant" as const;
      const res = await db.query(
        `INSERT INTO billing_events (tenant_id, event_id, plan, period, status, amount, currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tenant_id, event_id) DO NOTHING RETURNING event_id`,
        [event.tenant, event.eventId, event.plan, event.period, event.status, event.amount, event.currency],
      );
      if (res.rows.length > 0) {
        await applyPaycellEventToWorkspace(db, event.tenant, event);
        return "created" as const;
      }
      return "duplicate" as const;
    });
    if (stored === "unknown_tenant") return new Response(null, { status: 404 });
    return Response.json({ ok: true, duplicate: stored === "duplicate" });
  } catch (err) {
    void reportServerError("api.billing.paycell.webhook", err, { tenant: event.tenant, eventId: event.eventId });
    return new Response(null, { status: 503 });
  }
}
