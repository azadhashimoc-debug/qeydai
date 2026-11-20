"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";

const copy = {
  az: {
    title: "İlkin quraşdırma",
    steps: ["Biznesiniz", "Məqsədləriniz", "Müraciət kanalları"],
    company: "Biznes adı", industry: "Sektor", role: "Rolunuz", size: "Komanda ölçüsü",
    industries: ["Təhsil", "Xidmət", "Pərakəndə satış", "Digər"],
    roles: ["Sahib / təsisçi", "Menecer", "Satış əməkdaşı", "Digər"],
    choose: "Seçin", goalsHint: "Bir və ya iki məqsəd seçin.",
    goals: ["Mesajlara cavab vermək", "Satışları izləmək", "Sınaq dərsləri və görüşlər planlamaq", "Hesabatları izləmək"],
    channelsHint: "Müraciət aldığınız əsas kanalı seçin.",
    channels: ["WhatsApp", "Instagram", "Telegram", "Veb sayt", "Hələ kanalım yoxdur"],
    back: "Geri", next: "Davam et", finish: "Quraşdırmanı tamamla",
    saving: "Saxlanılır…", error: "Quraşdırma saxlanmadı. Yenidən cəhd edin.",
  },
  en: {
    title: "Initial setup",
    steps: ["Your business", "Your goals", "Lead sources"],
    company: "Business name", industry: "Industry", role: "Your role", size: "Team size",
    industries: ["Education", "Services", "Retail", "Other"],
    roles: ["Owner / founder", "Manager", "Sales representative", "Other"],
    choose: "Select an option", goalsHint: "Choose one or two goals.",
    goals: ["Reply to messages", "Track sales", "Schedule trial lessons and appointments", "Track reports"],
    channelsHint: "Choose your main source of leads.",
    channels: ["WhatsApp", "Instagram", "Telegram", "Website", "No channel yet"],
    back: "Back", next: "Continue", finish: "Complete setup",
    saving: "Saving…", error: "Setup could not be saved. Try again.",
  },
} as const;

export function WorkspaceSetup({
  lang, tenantId, onFinish, children,
}: {
  lang: "az" | "en";
  tenantId: string;
  onFinish: (goal: number) => void;
  children: ReactNode;
}) {
  const d = copy[lang];
  const storageKey = `panelim:workspace-setup:v1:${tenantId}`;
  const [complete, setComplete] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [role, setRole] = useState("");
  const [size, setSize] = useState("");
  const [goals, setGoals] = useState<number[]>([]);
  const [channel, setChannel] = useState("");
  const [error, setError] = useState(false);

  if (complete) return children;

  const canContinue = step === 0
    ? Boolean(company.trim() && industry && role && size)
    : step === 1 ? goals.length > 0 : channel !== "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        company: company.trim(), industry, role, size, goals, channel,
      }));
    } catch {
      setError(true);
      return;
    }
    onFinish(goals[0]);
    setComplete(true);
  }

  const selectOptions = (options: readonly string[]) => options.map((label, index) => (
    <option key={label} value={index}>{label}</option>
  ));

  return (
    <>
      <div inert aria-hidden="true">{children}</div>
      <div className="panel-setup-overlay">
      <section className="panel-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <div className="panel-setup-header">
          <p className="panel-setup-progress" aria-live="polite">{step + 1} / {d.steps.length} · {d.title}</p>
          <h1 id="setup-title" className="mt-2 text-2xl font-bold">{d.steps[step]}</h1>
        </div>
        <form onSubmit={submit}>
          <div className="panel-setup-body">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 sm:col-span-2">{d.company}
                <input className="rounded-lg border border-line bg-bg p-3" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} required />
              </label>
              <label className="grid gap-1">{d.industry}
                <select className="rounded-lg border border-line bg-bg p-3" value={industry} onChange={(e) => setIndustry(e.target.value)} required>
                  <option value="">{d.choose}</option>{selectOptions(d.industries)}
                </select>
              </label>
              <label className="grid gap-1">{d.role}
                <select className="rounded-lg border border-line bg-bg p-3" value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="">{d.choose}</option>{selectOptions(d.roles)}
                </select>
              </label>
              <label className="grid gap-1">{d.size}
                <select className="rounded-lg border border-line bg-bg p-3" value={size} onChange={(e) => setSize(e.target.value)} required>
                  <option value="">{d.choose}</option>
                  {["1", "2–5", "6–20", "21+"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
            </div>
          )}
          {step === 1 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2">{d.goalsHint}</legend>
              {d.goals.map((goal, index) => (
                <label key={goal} className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3">
                  <input type="checkbox" checked={goals.includes(index)}
                    disabled={goals.length === 2 && !goals.includes(index)}
                    onChange={(e) => setGoals(e.target.checked ? [...goals, index] : goals.filter((item) => item !== index))} />
                  {goal}
                </label>
              ))}
            </fieldset>
          )}
          {step === 2 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2">{d.channelsHint}</legend>
              {d.channels.map((label, index) => (
                <label key={label} className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3">
                  <input type="radio" name="channel" value={index} checked={channel === String(index)} onChange={(e) => setChannel(e.target.value)} />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          {error && <p role="alert" className="text-danger">{d.error}</p>}
          </div>
          <div className="panel-setup-footer">
            {step > 0 && <button type="button" className="min-h-11 px-4" onClick={() => setStep(step - 1)}>{d.back}</button>}
            <button type="submit" className={buttonClass({ size: "sm", className: "min-h-11" })} disabled={!canContinue}>
              {step === 2 ? d.finish : d.next}
            </button>
          </div>
        </form>
      </section>
      </div>
    </>
  );
}
