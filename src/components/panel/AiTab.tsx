"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

const SCENARIOS = [
  { id: "greeting", title: "Salamlama mesajı", body: "Salam! Mərkəzimizlə əlaqə saxladığınız üçün təşəkkür edirik. Sizə necə kömək edə bilərik?" },
  { id: "price", title: "Qiymət sualı", body: "IELTS kursumuz aylıq 180 AZN-dir. Şənbə 11:00 sınaq dərsinə yazılmaq istəyirsiniz?" },
  { id: "booking", title: "Sınaq dərsə yazılma", body: "Adınızı və telefon nömrənizi yazın. Boş yer varsa qeydiyyatınızı təsdiqləyirik." },
  { id: "handoff", title: "Mençərə ötürmə", body: "Endirim və xüsusi tələblər üçün menecerimizlə əlaqə saxlamaq istəyirsiniz?" },
];

export function AiTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const ai = d.ai;

  const label = (key: string) => (ai as Record<string, string>)[key];

  return (
    <div className="space-y-6">
      <header className="panel-card crm-section-heading">
        <h1 className="text-2xl font-semibold sm:text-3xl">{label("title")}</h1>
        <p className="text-muted">{label("subtitle")}</p>
      </header>

      <div className="panel-card crm-form-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 rounded border-brand text-brand focus:ring-brand" />
          {label("activeLabel")}
        </label>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border ${enabled ? "border-stamp/40 bg-stamp/10 text-stamp" : "border-line bg-bg text-ink"}`}>
          {enabled ? label("active") : label("inactive")}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SCENARIOS.map((s) => {
          const localKey = {
            greeting: "greeting",
            price: "price",
            booking: "booking",
            handoff: "handoff",
          }[s.id];
          return (
            <div key={s.id} className="panel-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{label(localKey ?? s.id)}</p>
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
          );
        })}
      </div>
    </div>
  );
}
