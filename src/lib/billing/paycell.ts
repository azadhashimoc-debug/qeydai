import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const PAYCELL_PLANS = ["starter", "growth", "pro", "enterprise"] as const;
export const PAYCELL_CHECKOUT_PLANS = ["starter", "growth", "pro"] as const;
export const PAYCELL_PERIODS = ["monthly", "halfYear", "annual"] as const;
export const PAYCELL_STATUSES = ["paid", "failed", "refunded"] as const;

export type PaycellCheckoutPlan = (typeof PAYCELL_CHECKOUT_PLANS)[number];
export type PaycellPeriod = (typeof PAYCELL_PERIODS)[number];

/** Total charge in AZN for each self-serve plan and billing cycle. */
export const PAYCELL_PRICES_AZN: Record<PaycellCheckoutPlan, Record<PaycellPeriod, number>> = {
  starter: { monthly: 100, halfYear: 540, annual: 960 },
  growth: { monthly: 160, halfYear: 870, annual: 1560 },
  pro: { monthly: 240, halfYear: 1290, annual: 2280 },
};

export type PaycellCheckoutPayload = {
  orderId: string;
  tenant: string;
  plan: PaycellCheckoutPlan;
  period: PaycellPeriod;
  amount: number;
  currency: "AZN";
  signature: string;
  checkoutUrl: string;
};

export function createPaycellCheckoutPayload(input: {
  tenant: string;
  plan: PaycellCheckoutPlan;
  period: PaycellPeriod;
  secret: string;
  checkoutUrl: string;
  orderId?: string;
}): PaycellCheckoutPayload {
  const amount = PAYCELL_PRICES_AZN[input.plan][input.period];
  const orderId = input.orderId ?? `ord_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const canonical = `${orderId}|${input.tenant}|${input.plan}|${input.period}|${amount}|AZN`;
  const signature = createHmac("sha256", input.secret).update(canonical, "utf8").digest("hex");
  return {
    orderId,
    tenant: input.tenant,
    plan: input.plan,
    period: input.period,
    amount,
    currency: "AZN",
    signature,
    checkoutUrl: input.checkoutUrl,
  };
}

export type PaycellEvent = {
  eventId: string;
  tenant: string;
  plan: (typeof PAYCELL_PLANS)[number];
  period: (typeof PAYCELL_PERIODS)[number];
  status: (typeof PAYCELL_STATUSES)[number];
  amount: number;
  currency: "AZN";
};

/** HMAC-SHA256 over the raw body, hex, optionally prefixed with `sha256=`. Constant-time compare. */
export function verifyPaycellSignature(raw: Buffer, header: string, secret: string): boolean {
  const sig = header.startsWith("sha256=") ? header.slice(7) : header;
  if (!secret || !/^[a-f0-9]{64}$/i.test(sig)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(sig, "hex"));
}

const oneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === "string" && (list as readonly string[]).includes(v);

export function parsePaycellEvent(body: unknown): PaycellEvent | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.eventId !== "string" || !/^[A-Za-z0-9_.:-]{1,128}$/.test(b.eventId)) return null;
  if (typeof b.tenant !== "string" || !b.tenant || b.tenant.length > 64) return null;
  if (!oneOf(PAYCELL_PLANS, b.plan) || !oneOf(PAYCELL_PERIODS, b.period) || !oneOf(PAYCELL_STATUSES, b.status)) return null;
  if (typeof b.amount !== "number" || !Number.isFinite(b.amount) || b.amount < 0 || b.amount > 1_000_000) return null;
  if (b.currency !== "AZN") return null;
  return { eventId: b.eventId, tenant: b.tenant, plan: b.plan, period: b.period, status: b.status, amount: b.amount, currency: "AZN" };
}
