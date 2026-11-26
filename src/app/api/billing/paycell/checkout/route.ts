import {
  fail,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import {
  createPaycellCheckoutPayload,
  PAYCELL_CHECKOUT_PLANS,
  PAYCELL_PERIODS,
  type PaycellCheckoutPlan,
  type PaycellPeriod,
} from "@/lib/billing/paycell";

export const POST = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const secret = (process.env.QEYDAI_PAYCELL_WEBHOOK_SECRET ?? "").trim();
    const checkoutUrl = (process.env.QEYDAI_PAYCELL_CHECKOUT_URL ?? "").trim();
    if (!secret || !checkoutUrl) {
      return fail(503, "billing_not_configured");
    }

    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail(400, "invalid_json");
    }

    const body = parsed as Record<string, unknown>;
    const plan = body.plan;
    const period = body.period;
    if (
      typeof plan !== "string" ||
      !(PAYCELL_CHECKOUT_PLANS as readonly string[]).includes(plan)
    ) {
      return fail(422, "invalid_input", { field: "plan" });
    }
    if (
      typeof period !== "string" ||
      !(PAYCELL_PERIODS as readonly string[]).includes(period)
    ) {
      return fail(422, "invalid_input", { field: "period" });
    }

    return withWorkspace(member, async (actor) => {
      if (actor.role !== "owner") return fail(403, "forbidden");
      const checkout = createPaycellCheckoutPayload({
        tenant: actor.tenantId,
        plan: plan as PaycellCheckoutPlan,
        period: period as PaycellPeriod,
        secret,
        checkoutUrl,
      });
      return json(200, { ok: true, checkout });
    });
  });
