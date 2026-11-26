"use client";

import Link from "next/link";
import { useState } from "react";

type PeriodKey = "monthly" | "halfYear" | "annual";

export type PricingTier = {
  id: string;
  name: string;
  desc: string;
  popular?: boolean;
  popularBadge?: string;
  prices: Record<PeriodKey, string>;
  setupNote: string;
  ctaLabel: string;
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

export function PricingTiersClient({
  lang,
  periods,
  perMonthLabel,
  tiers,
}: PricingTiersProps) {
  const [period, setPeriod] = useState<PeriodKey>("monthly");
  const periodBillingNote =
    period === "annual"
      ? lang === "en"
        ? "billed annually"
        : "illik ödənişdə"
      : period === "halfYear"
        ? lang === "en"
          ? "billed every 6 months"
          : "6 aylıq ödənişdə"
        : lang === "en"
          ? "billed monthly"
          : "aylıq ödəniş";

  return (
    <div className="pm-tiers-wrap">
      <div className="pm-periods-bar" role="tablist" aria-label="Billing period">
        {(["monthly", "halfYear", "annual"] as const).map((key) => (
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
        {tiers.map((tier) => (
          <article
            key={tier.id}
            className={tier.popular ? "pm-plan-card is-popular" : "pm-plan-card"}
          >
            {tier.popular && tier.popularBadge && (
              <span className="pm-plan-badge">{tier.popularBadge}</span>
            )}
            <div>
              <h3>{tier.name}</h3>
              <p className="pm-plan-desc">{tier.desc}</p>
            </div>

            <div className="pm-plan-price">
              <strong>{tier.prices[period]}</strong>
              {tier.prices[period].includes("AZN") && (
                <span>
                  {perMonthLabel} · {periodBillingNote}
                </span>
              )}
            </div>
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
              href={tier.id === "enterprise" ? `/${lang}/contact` : `/${lang}/demo`}
              className={tier.popular ? "pm-btn pm-btn-primary" : "pm-btn pm-btn-outline"}
              style={{ marginTop: "auto", width: "100%", justifyContent: "center" }}
            >
              {tier.ctaLabel}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
