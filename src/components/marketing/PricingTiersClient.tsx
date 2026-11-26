"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BILLING_PERIODS,
  PERIOD_MONTHS,
  PLAN_MONTHLY_AZN,
  planTermTotalAzn,
  type BillingPeriod,
  type PlanId,
} from "@/lib/marketing/pricing";

export type PricingTier = {
  id: PlanId | "enterprise";
  name: string;
  desc: string;
  popular?: boolean;
  popularBadge?: string;
  /** Shown instead of a price for the custom (enterprise) tier. */
  customPrice?: string;
  setupNote: string;
  ctaLabel: string;
  ctaHref: string;
  limits: string[];
};

export type PricingTiersProps = {
  lang: "az" | "en";
  periods: {
    monthly: string;
    halfYear: string;
    annual: string;
    saveBadge: string;
  };
  perMonthLabel: string;
  tiers: PricingTier[];
};

function billedNote(lang: "az" | "en", plan: PlanId, period: BillingPeriod): string {
  if (period === "monthly") return lang === "en" ? "Billed monthly" : "Hər ay ödənilir";
  const total = planTermTotalAzn(plan, period);
  const months = PERIOD_MONTHS[period];
  const monthly = PLAN_MONTHLY_AZN[plan].monthly;
  return lang === "en"
    ? `${total} AZN billed every ${months} months (instead of ${monthly} AZN/month)`
    : `${months} ayda bir ${total} AZN ödənilir (aylıq ${monthly} AZN əvəzinə)`;
}

export function PricingTiersClient({ lang, periods, perMonthLabel, tiers }: PricingTiersProps) {
  // Monthly is the headline price everywhere (site, JSON-LD, llms.txt), so it is the default.
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <div className="pm-tiers-wrap">
      <div className="pm-periods-bar" role="tablist" aria-label={lang === "en" ? "Billing period" : "Ödəniş dövrü"}>
        {BILLING_PERIODS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={period === key}
            onClick={() => setPeriod(key)}
            className={period === key ? "pm-period-pill is-active" : "pm-period-pill"}
          >
            <span>{periods[key]}</span>
            {key === "annual" && <span className="pm-period-badge">{periods.saveBadge}</span>}
          </button>
        ))}
      </div>

      <div className="pm-plans-grid-4">
        {tiers.map((tier) => {
          const plan = tier.id === "enterprise" ? null : tier.id;
          return (
            <article key={tier.id} className={tier.popular ? "pm-plan-card is-popular" : "pm-plan-card"}>
              {tier.popular && tier.popularBadge && <span className="pm-plan-badge">{tier.popularBadge}</span>}
              <div>
                <h3>{tier.name}</h3>
                <p className="pm-plan-desc">{tier.desc}</p>
              </div>

              <div className="pm-plan-price" data-period={period}>
                <strong>{plan ? `${PLAN_MONTHLY_AZN[plan][period]} AZN` : tier.customPrice}</strong>
                {plan && <span>{perMonthLabel}</span>}
              </div>
              {plan && <p className="pm-plan-billed">{billedNote(lang, plan, period)}</p>}
              <p className="pm-plan-setup">{tier.setupNote}</p>

              <ul className="pm-plan-limits">
                {tier.limits.map((lim) => (
                  <li key={lim}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={tier.popular ? "pm-btn pm-btn-primary" : "pm-btn pm-btn-outline"}
                style={{ marginTop: "auto", width: "100%", justifyContent: "center" }}
              >
                {tier.ctaLabel}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
