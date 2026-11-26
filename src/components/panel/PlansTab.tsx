"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

type PlanKey = "starter" | "growth" | "pro" | "enterprise";
type CheckoutPlanKey = "starter" | "growth" | "pro";

type SubscriptionInfo = {
  plan: PlanKey;
  period: string;
  status: string;
  amount: number;
  currency: string;
  receivedAt: string;
};

type EntitlementInfo = {
  planCode: "trial" | PlanKey;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  canWrite: boolean;
  trialEndsAt: string;
  trialDaysLeft: number;
  currentPeriodEnd: string | null;
  limits: {
    maxChannels: number;
    maxMembers: number;
    maxMonthlyAiReplies: number;
    maxDeals: number;
  };
};

type CheckoutPayload = {
  orderId: string;
  tenant: string;
  plan: CheckoutPlanKey;
  period: "monthly" | "halfYear" | "annual";
  amount: number;
  currency: "AZN";
  signature: string;
  checkoutUrl: string;
};

const PRICES: Record<PlanKey, { monthly: string; halfYear: string; annual: string }> = {
  starter: { monthly: "49 AZN", halfYear: "44 AZN", annual: "39 AZN" },
  growth: { monthly: "89 AZN", halfYear: "80 AZN", annual: "71 AZN" },
  pro: { monthly: "149 AZN", halfYear: "134 AZN", annual: "119 AZN" },
  enterprise: { monthly: "Fərdi", halfYear: "Fərdi", annual: "Fərdi" },
};

function submitPaycellCheckoutForm(checkout: CheckoutPayload) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.checkoutUrl;
  const fields: Record<string, string> = {
    orderId: checkout.orderId,
    tenant: checkout.tenant,
    plan: checkout.plan,
    period: checkout.period,
    amount: String(checkout.amount),
    currency: checkout.currency,
    signature: checkout.signature,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function PlansTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const plansDict = d.plans;
  const [period, setPeriod] = useState<"monthly" | "halfYear" | "annual">("monthly");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementInfo | null>(null);
  const [checkoutConfigured, setCheckoutConfigured] = useState(false);
  const [checkingOutPlan, setCheckingOutPlan] = useState<CheckoutPlanKey | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<{
    kind: "info" | "error";
    text: string;
    showContact?: boolean;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/panel/billing", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            ok?: boolean;
            subscription?: SubscriptionInfo | null;
            entitlement?: EntitlementInfo | null;
            checkoutConfigured?: boolean;
          } | null,
        ) => {
          if (controller.signal.aborted || !data?.ok) return;
          if (data.subscription) setSubscription(data.subscription);
          if (data.entitlement) setEntitlement(data.entitlement);
          setCheckoutConfigured(Boolean(data.checkoutConfigured));
        },
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function startCheckout(plan: CheckoutPlanKey) {
    if (checkingOutPlan) return;
    setCheckingOutPlan(plan);
    setCheckoutNotice(null);
    try {
      const res = await fetch("/api/billing/paycell/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ plan, period }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          checkout?: CheckoutPayload;
        } | null;
        if (data?.ok && data.checkout) {
          setCheckoutNotice({
            kind: "info",
            text:
              lang === "en"
                ? "Redirecting to Paycell secure checkout..."
                : "Paycell təhlükəsiz ödəniş səhifəsinə yönləndirilirsiniz...",
          });
          submitPaycellCheckoutForm(data.checkout);
          return;
        }
      }
      if (res.status === 503) {
        setCheckoutNotice({
          kind: "info",
          showContact: true,
          text:
            lang === "en"
              ? "Online Paycell card checkout is currently being finalized. Contact us to activate your selected plan via invoice or bank transfer right away."
              : "Onlayn Paycell kart ödənişi hazırda aktivləşdirilir. Seçdiyiniz planı faktura və ya bank köçürməsi ilə dərhal aktiv etmək üçün bizimlə əlaqə saxlayın.",
        });
        return;
      }
      if (res.status === 403) {
        setCheckoutNotice({
          kind: "error",
          text:
            lang === "en"
              ? "Only the workspace owner can manage billing and plan upgrades."
              : "Yalnız iş sahəsinin sahibi (owner) abunə planını dəyişə bilər.",
        });
        return;
      }
      setCheckoutNotice({
        kind: "error",
        text:
          lang === "en"
            ? "Could not start checkout right now. Please try again."
            : "Ödəniş sessiyası başladıla bilmədi. Yenidən cəhd edin.",
      });
    } catch {
      setCheckoutNotice({
        kind: "error",
        text:
          lang === "en"
            ? "Network error while contacting billing service."
            : "Ödəniş xidməti ilə əlaqə xətası baş verdi.",
      });
    } finally {
      setCheckingOutPlan(null);
    }
  }

  const periods = {
    monthly: plansDict.monthly ?? "Aylıq",
    halfYear: plansDict.halfYear ?? "6 aylıq",
    annual: plansDict.annual ?? "İllik",
  };
  const perMonth = plansDict.perMonth ?? "/ ay";
  const setupPrefix = plansDict.setupPrefix ?? "Quraşdırma:";
  const setupValue = plansDict.setupValue ?? "100 AZN (birdəfəlik, İnkişaf və Pro üçün)";
  const popularBadge = plansDict.popular ?? "Ən populyar";
  const periodSuffix =
    period === "annual"
      ? lang === "en"
        ? "· billed annually"
        : "· illik ödənişdə"
      : period === "halfYear"
        ? lang === "en"
          ? "· billed every 6 months"
          : "· 6 aylıq ödənişdə"
        : "";

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

      {entitlement && (
        <div
          className={`panel-card p-4 rounded-xl border text-sm flex flex-wrap items-center justify-between gap-3 ${
            !entitlement.canWrite
              ? "border-danger/40 bg-danger/10"
              : entitlement.status === "active"
                ? "border-stamp/40 bg-stamp/10"
                : "border-brand/30 bg-brand/5"
          }`}
        >
          <div className="space-y-0.5">
            <p className="font-semibold text-ink">
              {entitlement.status === "active"
                ? lang === "en"
                  ? `Active plan: ${entitlement.planCode.toUpperCase()}`
                  : `Aktiv plan: ${entitlement.planCode.toUpperCase()}`
                : entitlement.status === "trialing"
                  ? lang === "en"
                    ? `14-day free trial (${entitlement.trialDaysLeft} day(s) remaining)`
                    : `14 günlük pulsuz sınaq (${entitlement.trialDaysLeft} gün qalıb)`
                  : lang === "en"
                    ? "Trial or subscription expired — upgrade to restore full access"
                    : "Sınaq və ya abunə müddəti bitib — tam giriş üçün plan seçin"}
            </p>
            <p className="text-xs text-muted">
              {lang === "en"
                ? `Limits: up to ${entitlement.limits.maxChannels} channels, ${entitlement.limits.maxMembers} team members, ${entitlement.limits.maxMonthlyAiReplies} AI replies/mo.`
                : `Limitlər: ${entitlement.limits.maxChannels} kanal, ${entitlement.limits.maxMembers} komanda üzvü, ayda ${entitlement.limits.maxMonthlyAiReplies} AI cavab.`}
            </p>
          </div>
          {!checkoutConfigured && (
            <span className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted">
              {lang === "en" ? "Invoice / Paycell setup" : "Faktura / Paycell aktivasiyası"}
            </span>
          )}
        </div>
      )}

      {checkoutNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`panel-card p-4 rounded-xl border text-sm space-y-2 ${
            checkoutNotice.kind === "error"
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-brand/30 bg-bg text-ink"
          }`}
        >
          <p>{checkoutNotice.text}</p>
          {checkoutNotice.showContact && (
            <Link
              href={`/${lang}/contact`}
              className="inline-block text-xs font-semibold text-brand underline"
            >
              {lang === "en" ? "Go to contact page →" : "Əlaqə səhifəsinə keç →"}
            </Link>
          )}
        </div>
      )}

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
          const isCurrent =
            (entitlement?.status === "active" && entitlement.planCode === p.id) ||
            (subscription?.status === "paid" && subscription.plan === p.id);
          const hasSetupFee = p.id === "growth" || p.id === "pro";
          const isSelfServe = p.id !== "enterprise";
          const isBusy = checkingOutPlan === p.id;

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
                {isSelfServe && (
                  <span className="ml-1 text-xs text-muted">
                    {perMonth} {periodSuffix}
                  </span>
                )}
              </div>
              <ul className="space-y-1.5 text-sm text-muted">
                {plansDict[p.id].limits.map((l: string) => (
                  <li key={l} className="flex items-start gap-2">
                    <span className="text-stamp mt-0.5">✓</span>
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted border-t border-line pt-2">
                {hasSetupFee
                  ? `${setupPrefix} ${setupValue}`
                  : p.id === "starter"
                    ? lang === "en"
                      ? "Setup fee: 0 AZN"
                      : "Quraşdırma haqqı: 0 AZN"
                    : lang === "en"
                      ? "Custom onboarding agreement"
                      : "Fərdi quraşdırma müqaviləsi"}
              </p>
              {isSelfServe ? (
                <button
                  type="button"
                  disabled={Boolean(checkingOutPlan) || isCurrent}
                  onClick={() => void startCheckout(p.id as CheckoutPlanKey)}
                  className={buttonClass({
                    variant: p.popular ? "primary" : "secondary",
                    size: "sm",
                    className: "mt-4 min-h-11 w-full",
                  })}
                >
                  {isBusy
                    ? lang === "en"
                      ? "Preparing..."
                      : "Hazırlanır..."
                    : isCurrent
                      ? lang === "en"
                        ? "Current plan"
                        : "Cari plan"
                      : plansDict[p.ctaKey]}
                </button>
              ) : (
                <Link
                  href={`/${lang}/contact`}
                  className={buttonClass({ variant: "secondary", size: "sm", className: "mt-4 min-h-11 w-full" })}
                >
                  {plansDict[p.ctaKey]}
                </Link>
              )}
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
