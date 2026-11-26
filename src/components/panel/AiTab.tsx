"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

const SCENARIOS = {
  az: [
    { id: "greeting", body: "Salam! Mərkəzimizlə əlaqə saxladığınız üçün təşəkkür edirik. Sizə necə kömək edə bilərik?" },
    { id: "price", body: "Xidmətimizin qiyməti 60 AZN-dir. Şənbə 11:00 üçün sizi yazaq?" },
    { id: "booking", body: "Adınızı və telefon nömrənizi yazın. Boş yer varsa qeydiyyatınızı təsdiqləyirik." },
    { id: "handoff", body: "Endirim və xüsusi tələblər üçün menecerimizlə əlaqə saxlamaq istəyirsiniz?" },
  ],
  en: [
    { id: "greeting", body: "Hello! Thank you for reaching out to our center. How can we help you today?" },
    { id: "price", body: "The service costs 60 AZN. Shall we book you for Saturday 11:00?" },
    { id: "booking", body: "Please share your full name and phone number. If seats are open, we will confirm your booking." },
    { id: "handoff", body: "Would you like me to connect you with a manager for discounts or special requests?" },
  ],
} as const;

export function AiTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const ai = d.ai;
  const scenarios = SCENARIOS[lang];

  const label = (key: string) => (ai as Record<string, string>)[key];

  return (
    <div className="space-y-6">
      <header className="panel-card crm-section-heading">
        <h1 className="text-2xl font-semibold sm:text-3xl">{label("title")}</h1>
        <p className="text-muted">{label("subtitle")}</p>
      </header>

      <div className="panel-card crm-form-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex cursor-not-allowed items-center gap-2 font-semibold text-muted">
          <input type="checkbox" checked={false} disabled readOnly className="w-4 h-4 rounded" />
          {label("activeLabel")}
        </label>
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border border-line bg-bg text-ink">
          {lang === "en" ? "Not available yet" : "Hələ aktiv deyil"}
        </span>
        <p className="text-xs text-muted">
          {lang === "en"
            ? "Automatic AI replies are not enabled in the pilot. The templates below are samples for operators."
            : "Avtomatik AI cavabı pilot mərhələdə aktiv deyil. Aşağıdakılar operatorlar üçün nümunə şablonlardır."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {scenarios.map((s) => (
          <div key={s.id} className="panel-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{label(s.id)}</p>
                <p className="text-sm text-muted line-clamp-2">{s.body}</p>
              </div>
              <button
                type="button"
                aria-expanded={activeScenario === s.id}
                onClick={() => setActiveScenario(activeScenario === s.id ? null : s.id)}
                className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
              >
                {activeScenario === s.id ? label("close") : label("open")}
              </button>
            </div>
            {activeScenario === s.id && (
              <div className="mt-3 p-3 rounded-lg border border-line bg-bg text-sm text-ink">
                {s.body}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
