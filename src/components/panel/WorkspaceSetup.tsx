"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

const text = {
  az: {
    title: "İş məkanınızı sizə uyğunlaşdıraq",
    description: "Bir neçə qısa suala cavab verin. QeydAI-ni biznesinizə uyğun tanış edək.",
    progress: "İlkin quraşdırma",
    steps: ["Biznesinizi tanıyaq", "Əsas məqsədləriniz nədir?", "Müştərilər sizə haradan yazır?", "Komandanız neçə nəfərdir?"],
    hints: [
      "Sahənizi siyahıdan seçin və ya özünüz yazın.",
      "Sizin üçün ən vacib iki məqsədi seçin.",
      "İstifadə etdiyiniz kanalları seçin. Bir neçəsini seçə bilərsiniz.",
      "Komandanıza uyğun tövsiyələr göstərmək üçün ölçüsünü seçin.",
    ],
    industry: "Fəaliyyət sahəsi",
    industryPlaceholder: "Sahəni seçin və ya yazın",
    role: "Sizin vəzifəniz",
    chooseRole: "Vəzifənizi seçin",
    business: "Biznesin adı (istəyə bağlı)",
    businessPlaceholder: "Məsələn, QeydAI mağazası",
    industries: [
      "Sağlamlıq və rifah", "Hüquq və məsləhət", "Rəqəmsal və İT xidmətləri",
      "Təhsil", "Maliyyə və sığorta", "Kontent yaradıcıları", "Daşınmaz əmlak",
      "İstehsalat", "Telekommunikasiya", "Pərakəndə satış və e-ticarət",
      "Nəqliyyat", "Qeyri-kommersiya təşkilatları", "Dövlət sektoru",
      "Avtomobil və avtoservis", "Qida və restoran", "Turizm", "Digər",
    ],
    roles: ["Sahib / təsisçi", "Direktor", "Menecer", "Satış əməkdaşı", "Marketinq mütəxəssisi", "Müştəri xidməti əməkdaşı", "Digər"],
    goals: [
      "Müştəri mesajlarına cavab vermək",
      "Satışları və müştəriləri izləmək",
      "Görüş və rezervasiyaları idarə etmək",
      "Hesabatları izləmək",
      "Reklamdan gələn müraciətləri toplamaq",
      "Müştərilərə avtomatik xatırlatmalar göndərmək",
      "Müştəri qruplarına təkliflər göndərmək",
    ],
    channels: ["WhatsApp", "Instagram", "Facebook", "TikTok", "Telegram", "Veb-sayt", "Digər kanallar", "Hələ kanalım yoxdur"],
    sizes: ["Yalnız mən", "2–3", "4–5", "6–10", "11–20", "21–50", "51–100", "101+"],
    back: "Geri", next: "Davam et", finish: "Tamamla və panelə keç",
    savingError: "Seçimlər saxlanmadı. Brauzer yaddaşını yoxlayıb yenidən cəhd edin.",
    stepOf: "mərhələ",
  },
  en: {
    title: "Let's customize your workspace",
    description: "Answer a few quick questions to get started with QeydAI.",
    progress: "Initial setup",
    steps: ["Tell us about your business", "What are your goals?", "Where do your leads come from?", "How many people are on your team?"],
    hints: [
      "Choose an industry or enter your own.",
      "Choose up to two priorities for your business.",
      "Select every channel your customers use.",
      "Select your team size for relevant recommendations.",
    ],
    industry: "Industry", industryPlaceholder: "Choose or enter an industry",
    role: "Your role", chooseRole: "Choose your role",
    business: "Business name (optional)", businessPlaceholder: "E.g. My store",
    industries: [
      "Health & wellness", "Legal & consulting", "Digital & IT services",
      "Education", "Finance & insurance", "Content creators", "Real estate",
      "Manufacturing", "Telecommunications", "Retail & ecommerce",
      "Transportation", "Nonprofit organizations", "Government",
      "Automotive", "Food services", "Tourism", "Other",
    ],
    roles: ["Owner / founder", "Director", "Manager", "Sales representative", "Marketing specialist", "Customer support", "Other"],
    goals: [
      "Reply to customer messages",
      "Track sales and customers",
      "Manage appointments and bookings",
      "Track reports",
      "Collect leads from ads",
      "Send automated follow-up reminders",
      "Send offers to customer groups",
    ],
    channels: ["WhatsApp", "Instagram", "Facebook", "TikTok", "Telegram", "Website", "Other sources", "No channels yet"],
    sizes: ["Just me", "2–3", "4–5", "6–10", "11–20", "21–50", "51–100", "101+"],
    back: "Back", next: "Continue", finish: "Finish and open workspace",
    savingError: "Could not save your choices. Check browser storage and try again.",
    stepOf: "step",
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
  const d = text[lang];
  const listId = useId();
  const storageKey = `qeydai:workspace-setup:v2:${tenantId}`;
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
  const [goals, setGoals] = useState<number[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [size, setSize] = useState("");
  const [error, setError] = useState(false);

  if (complete) return children;

  const canContinue = step === 0
    ? Boolean(industry.trim() && role)
    : step === 1
      ? goals.length > 0 && goals.length <= 2
      : step === 2
        ? channels.length > 0
        : Boolean(size);

  function toggleGoal(index: number) {
    setGoals((old) => old.includes(index) ? old.filter((item) => item !== index) : old.length < 2 ? [...old, index] : old);
  }

  function toggleChannel(name: string) {
    const noChannels = d.channels[d.channels.length - 1];
    setChannels((old) => {
      if (name === noChannels) return old.includes(name) ? [] : [name];
      const available = old.filter((item) => item !== noChannels);
      return available.includes(name) ? available.filter((item) => item !== name) : [...available, name];
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;
    setError(false);
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        version: 2, company: company.trim(), industry: industry.trim(), role,
        goals, channels, size, updatedAt: new Date().toISOString(),
      }));
    } catch {
      setError(true);
      return;
    }
    onFinish(goals[0]);
    setComplete(true);
  }

  return (
    <>
      <div inert aria-hidden="true">{children}</div>
      <div className="panel-setup-overlay">
        <section className="panel-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title" aria-describedby="setup-description">
          <header className="panel-setup-header">
            <p className="panel-setup-progress" aria-live="polite">{d.progress} · {step + 1} / 4</p>
            <div className="panel-setup-progress-track" aria-hidden="true">
              {[0, 1, 2, 3].map((value) => <span key={value} className={value <= step ? "is-active" : ""} />)}
            </div>
            <h1 id="setup-title" className="panel-setup-title">{d.steps[step]}</h1>
            <p id="setup-description" className="panel-setup-description">{d.hints[step]}</p>
          </header>
          <form className="panel-setup-form" onSubmit={submit}>
            <div className="panel-setup-body">
              {step === 0 && (
                <div className="panel-setup-fields">
                  <label className="panel-setup-label" htmlFor={listId}>{d.industry}</label>
                  <input
                    id={listId}
                    list={`${listId}-suggestions`}
                    className="panel-setup-input"
                    autoComplete="off"
                    placeholder={d.industryPlaceholder}
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value.slice(0, 100))}
                    maxLength={100}
                    required
                  />
                  <datalist id={`${listId}-suggestions`}>
                    {d.industries.map((item) => <option key={item} value={item} />)}
                  </datalist>
                  <label className="panel-setup-label" htmlFor={`${listId}-role`}>{d.role}</label>
                  <select
                    id={`${listId}-role`}
                    className="panel-setup-input"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    required
                  >
                    <option value="">{d.chooseRole}</option>
                    {d.roles.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <label className="panel-setup-label" htmlFor={`${listId}-business`}>{d.business}</label>
                  <input
                    id={`${listId}-business`}
                    className="panel-setup-input"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder={d.businessPlaceholder}
                    maxLength={120}
                  />
                </div>
              )}
              {step === 1 && (
                <fieldset className="panel-setup-choices">
                  <legend className="sr-only">{d.steps[1]}</legend>
                  {d.goals.map((label, index) => {
                    const selected = goals.includes(index);
                    return (
                      <label key={label} className={`panel-setup-choice ${selected ? "is-selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={goals.length >= 2 && !selected}
                          onChange={() => toggleGoal(index)}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </fieldset>
              )}
              {step === 2 && (
                <fieldset className="panel-setup-choices">
                  <legend className="sr-only">{d.steps[2]}</legend>
                  {d.channels.map((label) => (
                    <label key={label} className={`panel-setup-choice ${channels.includes(label) ? "is-selected" : ""}`}>
                      <input type="checkbox" checked={channels.includes(label)} onChange={() => toggleChannel(label)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              {step === 3 && (
                <fieldset className="panel-setup-sizes">
                  <legend className="sr-only">{d.steps[3]}</legend>
                  {d.sizes.map((value) => (
                    <label key={value} className={`panel-setup-size ${size === value ? "is-selected" : ""}`}>
                      <input className="sr-only" type="radio" name="team-size" value={value} checked={size === value} onChange={() => setSize(value)} />
                      <span>{value}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              {error && <p role="alert" className="panel-setup-error">{d.savingError}</p>}
            </div>
            <footer className="panel-setup-footer">
              {step > 0 ? (
                <button type="button" className="panel-setup-back" onClick={() => { setStep((old) => old - 1); setError(false); }}>{d.back}</button>
              ) : <span />}
              <button type="submit" className="panel-setup-next" disabled={!canContinue}>
                {step === 3 ? d.finish : d.next}<span aria-hidden="true"> →</span>
              </button>
            </footer>
          </form>
        </section>
      </div>
    </>
  );
}
