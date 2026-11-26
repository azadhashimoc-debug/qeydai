"use client";

import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

type PlanKey = "starter" | "growth" | "pro" | "enterprise";

type SubscriptionInfo = {
  plan: PlanKey;
  period: string;
  status: string;
  amount: number;
  currency: string;
  receivedAt: string;
};

const PRICES: Record<PlanKey, { monthly: string; halfYear: string; annual: string }> = {
  starter: { monthly: "100 AZN", halfYear: "90 AZN", annual: "80 AZN" },
  growth: { monthly: "160 AZN", halfYear: "145 AZN", annual: "130 AZN" },
  pro: { monthly: "240 AZN", halfYear: "215 AZN", annual: "190 AZN" },
  enterprise: { monthly: "Fərdi", halfYear: "Fərdi", annual: "Fərdi" },
};

export function PlansTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const plansDict = d.plans;
  const [period, setPeriod] = useState<"monthly" | "halfYear" | "annual">("halfYear");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/panel/billing", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok?: boolean; subscription?: SubscriptionInfo | null } | null) => {
        if (!controller.signal.aborted && data?.ok && data.subscription) {
          setSubscription(data.subscription);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const periods = {
    monthly: plansDict.monthly ?? "Aylıq",
    halfYear: plansDict.halfYear ?? "6 aylıq",
    annual: plansDict.annual ?? "İllik",
  };
  const perMonth = plansDict.perMonth ?? "/ ay";
  const setupPrefix = plansDict.setupPrefix ?? "Quraşdırma:";
  const setupValue = plansDict.setupValue ?? "350 AZN (birdəfəlik)";
  const popularBadge = plansDict.popular ?? "Ən populyar";

  const plans: Array<{
    id: PlanKey;
    name: string;
    desc: string;
    prices: { monthly: string; halfYear: string; annual: string };
    ctaKey: "ctaStarter" | "ctaGrowth" | "ctaPro" | "ctaEnterprise";
    popular: boolean;
  }> = [
    {
      id: "starter",
      name: plansDict.starter.name,
      desc: plansDict.starter.desc,
      prices: PRICES.starter,
      ctaKey: "ctaStarter",
      popular: false,
    },
    {
      id: "growth",
      name: plansDict.growth.name,
      desc: plansDict.growth.desc,
      prices: PRICES.growth,
      ctaKey: "ctaGrowth",
      popular: true,
    },
    {
      id: "pro",
      name: plansDict.pro.name,
      desc: plansDict.pro.desc,
      prices: PRICES.pro,
      ctaKey: "ctaPro",
      popular: false,
    },
    {
      id: "enterprise",
      name: plansDict.enterprise.name,
      desc: plansDict.enterprise.desc,
      prices:
        lang === "en"
          ? { monthly: "Custom", halfYear: "Custom", annual: "Custom" }
          : PRICES.enterprise,
      ctaKey: "ctaEnterprise",
      popular: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">{plansDict.title}</h2>
        <p className="text-muted">{plansDict.subtitle}</p>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        <label className="cursor-pointer flex items-center gap-1">
          <input type="radio" name="period" value="monthly" checked={period === "monthly"} onChange={() => setPeriod("monthly")} className="w-3 h-3 rounded text-brand" />
          {periods.monthly}
        </label>
        <label className="cursor-pointer flex items-center gap-1">
          <input type="radio" name="period" value="halfYear" checked={period === "halfYear"} onChange={() => setPeriod("halfYear")} className="w-3 h-3 rounded text-brand" />
          {periods.halfYear}
        </label>
        <label className="cursor-pointer flex items-center gap-1">
          <input type="radio" name="period" value="annual" checked={period === "annual"} onChange={() => setPeriod("annual")} className="w-3 h-3 rounded text-brand" />
          {periods.annual}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = subscription?.status === "paid" && subscription.plan === p.id;
          return (
          <div key={p.id} className={`panel-card p-5 rounded-xl border border-line relative ${p.popular ? "border-brand/50 shadow-[0_0_0_1px_color-mix(in_srgb,#3373ff_20%)]" : ""}`}>
            {isCurrent ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stamp bg-stamp/10 border border-stamp/30">
                {lang === "en" ? "Current plan" : "Cari plan"}
              </span>
            ) : p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20">
                {popularBadge}
              </span>
            )}
            <p className="font-semibold text-ink">{p.name}</p>
            <p className="text-xs text-muted line-clamp-2">{p.desc}</p>
            <div className="mt-3 mb-2">
              <span className="text-xl font-semibold text-ink">{p.prices[period]}</span>
              {p.id !== "enterprise" && <span className="ml-1 text-xs text-muted">{perMonth}</span>}
            </div>
            <ul className="space-y-1.5 text-sm text-muted">
              {plansDict[p.id].limits.map((l: string) => (
                <li key={l} className="flex items-start gap-2">
                  <span className="text-stamp mt-0.5">✓</span>
                  {l}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted border-t border-line pt-2">{setupPrefix} {setupValue}</p>
            <a href={`/${lang}#contact`} className={buttonClass({ variant: p.popular ? "primary" : "secondary", size: "sm", className: "mt-4 min-h-11 w-full" })}>
              {plansDict[p.ctaKey]}
            </a>
          </div>
          );
        })}
      </div>

      <div className="panel-card p-4 border border-line rounded-xl text-sm text-muted">
        <p>{plansDict.note ?? "WhatsApp mesaj xərcləri (Meta tarifi) ayrıca hesablanır və əvvəlcədən göstərilir."}</p>
      </div>
    </div>
  );
}
