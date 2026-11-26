"use client";

import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PanelLocale } from "./types";

type EntitlementSnapshot = {
  planCode: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  canWrite: boolean;
  trialDaysLeft: number;
};

export function TrialBanner({
  lang,
  onOpenPlans,
}: {
  lang: PanelLocale;
  onOpenPlans: () => void;
}) {
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/panel/billing", { credentials: "same-origin", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok?: boolean; entitlement?: EntitlementSnapshot } | null) => {
        if (!controller.signal.aborted && data?.ok && data.entitlement) {
          setEntitlement(data.entitlement);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!entitlement || entitlement.status === "active") return null;

  const isExpired = !entitlement.canWrite;
  const text = isExpired
    ? lang === "en"
      ? "Your 14-day free trial or subscription has ended. Choose a plan to continue adding channels, deals, and AI replies."
      : "14 günlük pulsuz sınaq və ya abunə müddətiniz bitib. Yeni kanal, anlaşma və AI cavabları üçün plan seçin."
    : lang === "en"
      ? `Free trial active — ${entitlement.trialDaysLeft} day(s) remaining.`
      : `14 günlük pulsuz sınaq aktivdir — ${entitlement.trialDaysLeft} gün qalıb.`;

  const cta = lang === "en" ? "Choose a plan" : "Plan seç";

  return (
    <div
      role={isExpired ? "alert" : "region"}
      aria-label={lang === "en" ? "Subscription status" : "Abunə vəziyyəti"}
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        isExpired
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-brand/30 bg-brand/5 text-ink"
      }`}
    >
      <p className="font-medium">{text}</p>
      <button
        type="button"
        onClick={onOpenPlans}
        className={buttonClass({
          variant: isExpired ? "primary" : "secondary",
          size: "sm",
          className: "min-h-10 shrink-0",
        })}
      >
        {cta}
      </button>
    </div>
  );
}
