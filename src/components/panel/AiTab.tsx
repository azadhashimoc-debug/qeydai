"use client";

import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict } from "./types";

type AiTone = "friendly" | "professional" | "concise";

type AiSettingsPayload = {
  enabled: boolean;
  model: string;
  businessContext: string;
  systemPrompt: string;
  tone: AiTone;
  handoffKeywords: string[];
  maxRepliesPerThread: number;
  monthlyReplyLimit: number;
};

type AiUsagePayload = {
  monthKey: string;
  repliesCount: number;
  copilotCount: number;
};

const SAMPLE_PROMPTS = {
  az: [
    "Salam, xidmətləriniz və qiymətlər haqqında məlumat verə bilərsiniz?",
    "Bu həftə üçün görüş təyin etmək istəyirəm, hansı saatlar boşdur?",
    "Menecerlə danışmaq istəyirəm, zəhmət olmasa zəng edin.",
  ],
  en: [
    "Hi! Could you share your services and pricing?",
    "I would like to book an appointment this week. What slots are available?",
    "Please connect me with a human manager.",
  ],
} as const;

const COPY = {
  az: {
    statusReady: "Groq AI hazırdır",
    statusMissingKey: "GROQ_API_KEY hələ təyin olunmayıb",
    usageLabel: "Bu ay avtomatik cavablar:",
    toneLabel: "Cavab üslubu",
    tones: {
      friendly: "Səmimi və köməksevər",
      professional: "Rəsmi və peşəkar",
      concise: "Qısa və konkret",
    },
    contextLabel: "Biznes məlumatları (xidmətlər, qiymətlər, iş saatları, ünvan, FAQ)",
    contextPlaceholder:
      "Məsələn: İş saatları 09:00–20:00 (Bazar ertəsi–Şənbə). Konsultasiya 30 AZN. Ünvan: Bakı. Ödəniş nağd və kartla qəbul olunur...",
    promptLabel: "Əlavə təlimatlar (istəyə bağlı)",
    promptPlaceholder: "Məsələn: Həmişə sonda ad və telefon nömrəsini soruş, endirim vəd etmə...",
    handoffLabel: "Operatora ötürmə açar sözləri (vergüllə)",
    maxRepliesLabel: "Bir söhbətdə maksimum AI cavab sayı",
    saveBtn: "Pani AI ayarlarını yadda saxla",
    savingBtn: "Yadda saxlanılır...",
    savedMsg: "Pani AI ayarları yadda saxlanıldı.",
    saveErr: "Ayarları yadda saxlamaq mümkün olmadı.",
    testHeading: "Canlı sınaq (Pani-ni yoxla)",
    testSub: "Müştəri mesajı yazın və Pani-nin cari biznes kontekstinizlə necə cavab verdiyini dərhal görün.",
    testPlaceholder: "Müştəri mesajını bura yazın...",
    testBtn: "Cavabı yoxla",
    testingBtn: "Pani yazır...",
    handoffTriggered: "Operatora ötürüldü — bu mesaj açar sözlə uyğunlaşdı:",
    testNotConfigured: "Serverdə GROQ_API_KEY təyin olunmadığı üçün canlı cavab alına bilmədi. Açar əlavə edildikdə dərhal aktiv olacaq.",
    testError: "AI cavabını almaq mümkün olmadı. Bir az sonra yenidən cəhd edin.",
  },
  en: {
    statusReady: "Groq AI ready",
    statusMissingKey: "GROQ_API_KEY not configured yet",
    usageLabel: "Monthly auto-replies:",
    toneLabel: "Reply tone",
    tones: {
      friendly: "Friendly & helpful",
      professional: "Professional & formal",
      concise: "Short & direct",
    },
    contextLabel: "Business knowledge base (services, pricing, hours, location, FAQ)",
    contextPlaceholder:
      "Example: Open Mon–Sat 09:00–20:00. Consultation starts at 30 AZN. Cash and card accepted...",
    promptLabel: "Additional instructions (optional)",
    promptPlaceholder: "Example: Always ask for the customer's name and phone number; never promise discounts...",
    handoffLabel: "Human handoff keywords (comma-separated)",
    maxRepliesLabel: "Max AI replies per conversation",
    saveBtn: "Save Pani AI settings",
    savingBtn: "Saving...",
    savedMsg: "Pani AI settings saved.",
    saveErr: "Could not save AI settings.",
    testHeading: "Live sandbox (Test Pani)",
    testSub: "Enter a sample customer message to preview how Pani replies with your current settings.",
    testPlaceholder: "Type a customer message...",
    testBtn: "Test reply",
    testingBtn: "Pani is replying...",
    handoffTriggered: "Handoff to human operator triggered by keyword:",
    testNotConfigured: "GROQ_API_KEY is not set on the server yet. Once added, live replies activate immediately.",
    testError: "Could not generate a reply right now. Please try again.",
  },
} as const;

export function AiTab({ lang, d }: { lang: "az" | "en"; d: PanelDict }) {
  const c = COPY[lang];
  const ai = d.ai;
  const label = (key: string) => (ai as Record<string, string>)[key];

  const [loading, setLoading] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [usage, setUsage] = useState<AiUsagePayload | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [tone, setTone] = useState<AiTone>("friendly");
  const [businessContext, setBusinessContext] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [handoffText, setHandoffText] = useState("operator, menecer, manager, human");
  const [maxRepliesPerThread, setMaxRepliesPerThread] = useState(8);
  const [monthlyLimit, setMonthlyLimit] = useState(500);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [sampleMessage, setSampleMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    kind: "reply" | "handoff" | "error";
    text: string;
    meta?: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/panel/ai/settings", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { aiConfigured?: boolean; settings?: AiSettingsPayload; usage?: AiUsagePayload }) => {
        if (!alive) return;
        setAiConfigured(Boolean(body.aiConfigured));
        if (body.usage) setUsage(body.usage);
        if (body.settings) {
          setEnabled(body.settings.enabled);
          setTone(body.settings.tone);
          setBusinessContext(body.settings.businessContext);
          setSystemPrompt(body.settings.systemPrompt);
          setHandoffText(body.settings.handoffKeywords.join(", "));
          setMaxRepliesPerThread(body.settings.maxRepliesPerThread);
          setMonthlyLimit(body.settings.monthlyReplyLimit);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function parseKeywords(): string[] {
    return handoffText
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length >= 2);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch("/api/panel/ai/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          enabled,
          tone,
          businessContext,
          systemPrompt,
          handoffKeywords: parseKeywords(),
          maxRepliesPerThread,
        }),
      });
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { usage?: AiUsagePayload } | null;
        if (body?.usage) setUsage(body.usage);
        setSaveFeedback({ kind: "ok", text: c.savedMsg });
      } else {
        setSaveFeedback({ kind: "error", text: c.saveErr });
      }
    } catch {
      setSaveFeedback({ kind: "error", text: c.saveErr });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const msg = sampleMessage.trim();
    if (!msg || testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/panel/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          message: msg,
          tone,
          businessContext,
          systemPrompt,
          handoffKeywords: parseKeywords(),
        }),
      });
      if (res.status === 503) {
        setTestResult({ kind: "error", text: c.testNotConfigured });
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        reply?: string;
        model?: string;
        handoffTriggered?: boolean;
        matchedKeyword?: string;
        latencyMs?: number;
      } | null;
      if (res.ok && data?.ok) {
        if (data.handoffTriggered) {
          setTestResult({
            kind: "handoff",
            text: `${c.handoffTriggered} "${data.matchedKeyword ?? ""}"`,
          });
        } else {
          setTestResult({
            kind: "reply",
            text: data.reply ?? "",
            meta: `${data.model ?? "Groq"}${data.latencyMs ? ` · ${data.latencyMs}ms` : ""}`,
          });
        }
        return;
      }
      setTestResult({ kind: "error", text: c.testError });
    } catch {
      setTestResult({ kind: "error", text: c.testError });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="panel-card crm-section-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{label("title")}</h1>
            <p className="text-muted">{label("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 ${
                aiConfigured
                  ? "border-stamp/40 bg-stamp/10 text-stamp"
                  : "border-line bg-bg text-muted"
              }`}
            >
              {aiConfigured ? c.statusReady : c.statusMissingKey}
            </span>
            {usage && (
              <span className="inline-flex items-center rounded-md border border-line bg-bg px-2.5 py-1 text-ink">
                {c.usageLabel} {usage.repliesCount} / {monthlyLimit}
              </span>
            )}
          </div>
        </div>
      </header>

      <form onSubmit={(e) => void handleSave(e)} className="panel-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={enabled}
              disabled={loading}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            {label("activeLabel")}
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <span>{c.toneLabel}</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as AiTone)}
              className="rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs font-medium text-ink"
            >
              <option value="friendly">{c.tones.friendly}</option>
              <option value="professional">{c.tones.professional}</option>
              <option value="concise">{c.tones.concise}</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1.5 text-xs font-semibold text-ink">
          <span>{c.contextLabel}</span>
          <textarea
            rows={5}
            maxLength={8000}
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            placeholder={c.contextPlaceholder}
            className="w-full rounded-xl border border-line bg-bg p-3 text-sm font-normal text-ink"
          />
        </label>

        <label className="block space-y-1.5 text-xs font-semibold text-ink">
          <span>{c.promptLabel}</span>
          <textarea
            rows={2}
            maxLength={4000}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={c.promptPlaceholder}
            className="w-full rounded-xl border border-line bg-bg p-3 text-sm font-normal text-ink"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-xs font-semibold text-ink">
            <span>{c.handoffLabel}</span>
            <input
              type="text"
              value={handoffText}
              onChange={(e) => setHandoffText(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal text-ink"
            />
          </label>
          <label className="block space-y-1.5 text-xs font-semibold text-ink">
            <span>{c.maxRepliesLabel}</span>
            <input
              type="number"
              min={1}
              max={50}
              value={maxRepliesPerThread}
              onChange={(e) => setMaxRepliesPerThread(Math.max(1, Math.min(50, Number(e.target.value) || 8)))}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-normal text-ink"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || loading}
            className={buttonClass({ variant: "primary", size: "sm", className: "min-h-11" })}
          >
            {saving ? c.savingBtn : c.saveBtn}
          </button>
          {saveFeedback && (
            <p
              role="status"
              aria-live="polite"
              className={`text-xs font-semibold ${
                saveFeedback.kind === "ok" ? "text-stamp" : "text-danger"
              }`}
            >
              {saveFeedback.text}
            </p>
          )}
        </div>
      </form>

      <section className="panel-card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{c.testHeading}</h2>
          <p className="text-xs text-muted">{c.testSub}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS[lang].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSampleMessage(preset)}
              className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink hover:border-brand"
            >
              {preset}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => void handleTest(e)} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sampleMessage}
            onChange={(e) => setSampleMessage(e.target.value)}
            placeholder={c.testPlaceholder}
            maxLength={1500}
            className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            disabled={testing || !sampleMessage.trim()}
            className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
          >
            {testing ? c.testingBtn : c.testBtn}
          </button>
        </form>

        {testResult && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl border p-3.5 text-sm ${
              testResult.kind === "reply"
                ? "border-stamp/40 bg-stamp/10 text-ink"
                : testResult.kind === "handoff"
                  ? "border-amber-400/50 bg-amber-400/10 text-ink"
                  : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            <p className="whitespace-pre-wrap">{testResult.text}</p>
            {testResult.meta && <p className="mt-1.5 text-[11px] text-muted">{testResult.meta}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
