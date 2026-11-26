/**
 * Single source of truth for public plan prices (AZN).
 *
 * Every page, the panel, JSON-LD, llms.txt and Paycell checkout read from here,
 * so a price change happens in one place. Prices are per month; the 6-month and
 * yearly figures are the per-month equivalent of a prepaid term.
 */
export const PLAN_IDS = ["starter", "growth", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_PERIODS = ["monthly", "halfYear", "annual"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/** Months paid up front for each billing period. */
export const PERIOD_MONTHS: Record<BillingPeriod, number> = { monthly: 1, halfYear: 6, annual: 12 };

/** Price per month in AZN for each plan and billing period. */
export const PLAN_MONTHLY_AZN: Record<PlanId, Record<BillingPeriod, number>> = {
  starter: { monthly: 49, halfYear: 44, annual: 39 },
  growth: { monthly: 89, halfYear: 80, annual: 71 },
  pro: { monthly: 149, halfYear: 134, annual: 119 },
};

/** One-time onboarding fee in AZN (0 = none). */
export const PLAN_SETUP_FEE_AZN: Record<PlanId, number> = { starter: 0, growth: 100, pro: 100 };

/** Free trial length for new workspaces, in days. */
export const TRIAL_DAYS = 14;

/** Total charged for one term (per-month price × months). */
export function planTermTotalAzn(plan: PlanId, period: BillingPeriod): number {
  return PLAN_MONTHLY_AZN[plan][period] * PERIOD_MONTHS[period];
}

/** Whole-percent saving of a prepaid period against paying monthly. */
export function planSavingPercent(plan: PlanId, period: BillingPeriod): number {
  const monthly = PLAN_MONTHLY_AZN[plan].monthly;
  return Math.round(((monthly - PLAN_MONTHLY_AZN[plan][period]) / monthly) * 100);
}

export function formatAzn(amount: number): string {
  return `${amount} AZN`;
}
