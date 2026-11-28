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

export function PlansTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const plansDict = d.plans;
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementInfo | null>(null);
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
          } | null,
        ) => {
          if (controller.signal.aborted || !data?.ok) return;
          if (data.subscription) setSubscription(data.subscription);
          if (data.entitlement) setEntitlement(data.entitlement);
        },
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const az = lang === "az";
  const rawWhatsApp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").trim();
  const whatsappNumber = rawWhatsApp.replace(/[^0-9]/g, "");
  const activationHref = /^[1-9][0-9]{6,14}$/.test(whatsappNumber)
    ? `https://wa.me/${whatsappNumber}`
    : `/${lang}/contact`;
  const activationLabel = az ? "Aktivləşdirmə üçün WhatsApp ilə əlaqə" : "Contact via WhatsApp to activate";
  const plans: Array<{
    id: CheckoutPlanKey;
    name: string;
    monthly: number;
    firstMonth: number;
    limits: string[];
    popular: boolean;
  }> = [
    {
      id: "starter",
      name: az ? "Başlanğıc" : "Starter",
      monthly: 99,
      firstMonth: 49,
      limits: az ? ["Müştəri bazası", "Rezervasiya", "İşçi paneli"] : ["Customer database", "Bookings", "Staff panel"],
      popular: false,
    },
    {
      id: "growth",
      name: az ? "Standart" : "Standard",
      monthly: 199,
      firstMonth: 99,
      limits: az ? ["Başlanğıc paketinin bütün imkanları", "WhatsApp bağlantısı", "Pani AI köməkçi", "Canlı quraşdırma"] : ["Everything in Starter", "WhatsApp connection", "Pani AI assistant", "Live onboarding"],
      popular: true,
    },
    {
      id: "pro",
      name: "Premium",
      monthly: 349,
      firstMonth: 175,
      limits: az ? ["Standart paketinin bütün imkanları", "Limitsiz işçi", "Öncəlikli texniki dəstək", "Aylıq hesabat"] : ["Everything in Standard", "Unlimited staff", "Priority technical support", "Monthly report"],
      popular: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">{plansDict.title}</h2>
        <p className="text-muted">{az ? "Paketinizi seçin və aktivləşdirmək üçün əlaqə saxlayın." : "Choose your plan and contact us to activate it."}</p>
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
                  ? `Active plan: ${plans.find((plan) => plan.id === entitlement.planCode)?.name ?? entitlement.planCode.toUpperCase()}`
                  : `Aktiv plan: ${plans.find((plan) => plan.id === entitlement.planCode)?.name ?? entitlement.planCode.toUpperCase()}`
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
          <Link href={activationHref} className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted">
            {activationLabel}
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent =
            (entitlement?.status === "active" && entitlement.planCode === p.id) ||
            (subscription?.status === "paid" && subscription.plan === p.id);

          return (
            <div key={p.id} className={`panel-card p-5 rounded-xl border border-line relative ${p.popular ? "border-brand/50 shadow-[0_0_0_1px_color-mix(in_srgb,#3373ff_20%)]" : ""}`}>
              {isCurrent ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stamp bg-stamp/10 border border-stamp/30">
                  {lang === "en" ? "Current plan" : "Cari plan"}
                </span>
              ) : p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand bg-brand/10 border border-brand/20">
                  {az ? "Tövsiyə olunan" : "Recommended"}
                </span>
              )}
              <p className="font-semibold text-ink">{p.name}</p>
              <div className="mt-3 mb-2">
                <span className="text-xl font-semibold text-ink">{p.monthly} AZN</span>
                <span className="ml-1 text-xs text-muted">{az ? "/ay" : "/mo"}</span>
                <p className="mt-1 text-sm font-semibold text-stamp">
                  {az ? "İlk ay" : "First month"}: {p.firstMonth} AZN
                </p>
              </div>
              <ul className="space-y-1.5 text-sm text-muted">
                {p.limits.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-stamp mt-0.5">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button type="button" disabled className={buttonClass({ variant: "secondary", size: "sm", className: "mt-4 min-h-11 w-full" })}>
                  {az ? "Cari plan" : "Current plan"}
                </button>
              ) : (
                <Link
                  href={activationHref}
                  className={buttonClass({ variant: p.popular ? "primary" : "secondary", size: "sm", className: "mt-4 min-h-11 w-full" })}
                >
                  {activationLabel}
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
