"use client";

import Image from "next/image";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { LeadRecord, PanelLocale, PanelSession, SalesDeal } from "./types";

type CopilotMode = "analyst" | "sources" | "overdue" | "assistant";

const COPY = {
  az: {
    triggerBtn: "✨ Pani",
    title: "Pani · panelim.az",
    newChat: "Yeni təhlil",
    expand: "Genişləndir",
    close: "Pani pəncərəsini bağla",
    modeLabel: "Pani rejimi",
    modes: {
      analyst: "Analist modu — Qazanc-İtki Analizi",
      sources: "Qaynaq Bazında Performans (2026)",
      overdue: "Gecikmiş Tapşırıqlar & İsti Lead-lər",
      assistant: "24/7 AI Təmsilçi & Avto-Tapşırıq",
    },
    analystSection: {
      crumb: "Lead itkisi analizi · Qazanc-İtki Qıfı",
      question: "Dəvət göndərildikdən sonra lead sayı niyə düşür?",
      answerBold: "Lead-lərin 37%-i",
      answerRest:
        "sınaq dərsi rezervasiya keçidini aldıqdan sonra 48 saat ərzində hərəkətə keçmədikləri üçün itirilir.",
      recLabel: "Təklif:",
      recBody: "Rezervasiya etməyən lead-lər ilə 24 saat ərzində avtomatik xatırlatma mesajı ilə əlaqə saxlayın.",
      funnelStages: [
        { label: "Gələn müştərilər", pct: 100, color: "bg-blue-500/25" },
        { label: "İlk təmas", pct: 84, color: "bg-amber-400/35" },
        { label: "Randevu keçidi", pct: 68, color: "bg-amber-500/35" },
        { label: "Planlandı", pct: 52, color: "bg-rose-400/30" },
        { label: "Xatırlatma mesajı", pct: 44, color: "bg-purple-500/30" },
        { label: "Görüşüldü", pct: 35, color: "bg-rose-400/30" },
        { label: "Təqib", pct: 24, color: "bg-emerald-500/30" },
        { label: "Qazanıldı", pct: 18, color: "bg-lime-500/40" },
      ],
    },
    sourcesSection: {
      crumb: "Qazanılan Müştərilər — Bu Ay və Öncəki Ay",
      question: "Bu il ən çox anlaşma qazandıran reklam qaynaqları hansılar idi?",
      heading: "📣 Qazanılan Anlaşmalara Görə Ən Önəmli Reklam Qaynaqları - 2026",
      subhead: "📊 Qaynaq Bazında Performans",
      colRank: "SIRALAMA",
      colSource: "QAYNAQ",
      colWon: "QAZANC",
      rows: [
        { rank: "🥇 1", source: "Meta Ads (Instagram & WhatsApp)", won: 124 },
        { rank: "🥈 2", source: "Google Ads", won: 98 },
        { rank: "🥉 3", source: "LinkedIn & Orqanik", won: 56 },
      ],
      copyBtn: "📋 Siyahını kopyala",
      copiedBtn: "✓ Kopyalandı",
      exportBtn: "📊 Yadda saxla .csv",
    },
    overdueSection: {
      crumb: "Gecikmiş Tapşırıqlar",
      question: "Məsuliyyətimdə olan və vaxtı keçmiş tapşırıqlara sahib lead-ləri tap.",
      heading: "📊 Yeni və Öncəlikli Lead-lər",
      subhead: "Məsul olduğunuz, vaxtı keçmiş tapşırıqları ehtiva edən önəmli lead-lər:",
      cards: [
        { name: "Cəngiz Qarasu", title: "İELTS İntensiv Qrup", tag: "tam_paket", age: "1g •" },
        { name: "Hakan Qaralar", title: "Uşaq Üzgüçülük Akademiyası", tag: "ozel_qrup", age: "1g •" },
      ],
    },
    assistantSection: {
      crumb: "Avtomatik Tapşırıq & 24/7 Cavab",
      userMsg: "Salam! Sabahkı sınaq dərsini saat 11:00-a dəyişə bilərik?",
      botMsg:
        "Təqvim yoxlanılır... Saat 11:00 qrupunda 2 boş yer mövcuddur, qeydiyyatınız yeniləndi!",
      taskBadge: "Tapşırıq vaxtı gəlmiş Sabah üçün Təmsilçi : ⟳ Təqib:",
      taskText: "Sınaq dərsi öncəsi valideynə WhatsApp konum və hazırlıq mesajı göndər.",
    },
    promptPlaceholder: "Pani-yə sual verin...",
    askBtn: "Soruş",
  },
  en: {
    triggerBtn: "✨ Pani",
    title: "Pani · panelim.az",
    newChat: "New analysis",
    expand: "Expand",
    close: "Close Pani drawer",
    modeLabel: "Pani mode",
    modes: {
      analyst: "Analyst mode — Win-Loss Funnel Analysis",
      sources: "Top Ad Sources Performance (2026)",
      overdue: "Overdue Tasks & Hot Leads",
      assistant: "24/7 AI Agent & Auto Follow-up Task",
    },
    analystSection: {
      crumb: "Lead loss analysis · Win-Loss Funnel",
      question: "Why does the lead count drop after sending the booking invite?",
      answerBold: "37% of leads",
      answerRest:
        "are lost because they do not take action within 48 hours of receiving the trial booking link.",
      recLabel: "Recommendation:",
      recBody: "Trigger an automated follow-up message within 24 hours for leads who haven't booked.",
      funnelStages: [
        { label: "Incoming leads", pct: 100, color: "bg-blue-500/25" },
        { label: "First contact", pct: 84, color: "bg-amber-400/35" },
        { label: "Booking link sent", pct: 68, color: "bg-amber-500/35" },
        { label: "Scheduled", pct: 52, color: "bg-rose-400/30" },
        { label: "Reminder message", pct: 44, color: "bg-purple-500/30" },
        { label: "Attended", pct: 35, color: "bg-rose-400/30" },
        { label: "Follow-up", pct: 24, color: "bg-emerald-500/30" },
        { label: "Won", pct: 18, color: "bg-lime-500/40" },
      ],
    },
    sourcesSection: {
      crumb: "Won Customers — This Month vs Last Month",
      question: "Which ad sources generated the most won deals this year?",
      heading: "📣 Top Ad Sources by Won Deals - 2026",
      subhead: "📊 Performance by Source",
      colRank: "RANK",
      colSource: "SOURCE",
      colWon: "WON",
      rows: [
        { rank: "🥇 1", source: "Meta Ads (Instagram & WhatsApp)", won: 124 },
        { rank: "🥈 2", source: "Google Ads", won: 98 },
        { rank: "🥉 3", source: "LinkedIn & Organic", won: 56 },
      ],
      copyBtn: "📋 Copy list",
      copiedBtn: "✓ Copied",
      exportBtn: "📊 Save .csv",
    },
    overdueSection: {
      crumb: "Overdue Tasks",
      question: "Find leads assigned to me that have overdue follow-up tasks.",
      heading: "📊 Priority Hot Leads",
      subhead: "Important leads with overdue tasks assigned to you:",
      cards: [
        { name: "Cengiz Karasu", title: "IELTS Intensive Group", tag: "full_bundle", age: "1d •" },
        { name: "Hakan Karalar", title: "Kids Swimming Academy", tag: "custom_group", age: "1d •" },
      ],
    },
    assistantSection: {
      crumb: "Automated Task & 24/7 Reply",
      userMsg: "Hi! Can we move my trial session tomorrow to 11:00 AM?",
      botMsg:
        "Checking calendar... 2 seats available in the 11:00 AM slot, your booking has been updated!",
      taskBadge: "Task due Tomorrow for Rep : ⟳ Follow-up:",
      taskText: "Send WhatsApp location pin and preparation checklist before trial class.",
    },
    promptPlaceholder: "Ask Pani...",
    askBtn: "Ask",
  },
} as const;

export function CopilotDrawer({
  lang,
  deals,
  leads,
  sessions,
}: {
  lang: PanelLocale;
  deals: SalesDeal[];
  leads: LeadRecord[];
  sessions: PanelSession[];
}) {
  const c = COPY[lang];
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<CopilotMode>("analyst");
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [customReply, setCustomReply] = useState<string | null>(null);

  function handleAsk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = prompt.trim();
    if (!q) return;
    const summary =
      lang === "az"
        ? `Canlı workspace xülasəsi: ${deals.length} aktiv satış kartı, ${leads.length} müraciət və ${sessions.length} dərs sessiyası təhlil edildi. "${q}" üzrə tövsiyə: ilk 15 dəqiqədə cavab verilən müraciətlərdə qeydiyyat dönüşümü 2.4x daha yüksəkdir.`
        : `Live workspace insight: Analyzed ${deals.length} deals, ${leads.length} leads, and ${sessions.length} sessions. For "${q}": leads contacted within 15 minutes convert 2.4x higher.`;
    setCustomReply(summary);
    setPrompt("");
  }

  async function handleCopySources() {
    const text = c.sourcesSection.rows.map((r) => `${r.rank} ${r.source}: ${r.won}`).join("\n");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={buttonClass({
          variant: "secondary",
          size: "sm",
          className: "min-h-11 js-copilot-trigger",
        })}
      >
        {c.triggerBtn}
      </button>

      {open && (
        <aside
          role="dialog"
          aria-label={c.title}
          className={`fixed top-16 right-4 bottom-4 z-50 flex flex-col rounded-2xl border-2 border-indigo-400/60 bg-surface shadow-2xl transition-all ${
            expanded ? "w-[min(640px,calc(100vw-2rem))]" : "w-[min(410px,calc(100vw-2rem))]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-lg">
                ✨
              </span>
              <strong className="text-base font-bold text-ink">{c.title}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCustomReply(null)}
                title={c.newChat}
                className="rounded border border-line bg-bg px-2 py-1 text-xs font-semibold text-ink hover:border-brand"
              >
                📝
              </button>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title={c.expand}
                className="rounded border border-line bg-bg px-2 py-1 text-xs font-semibold text-ink hover:border-brand"
              >
                ⤢
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={c.close}
                className="rounded border border-line bg-bg px-2 py-1 text-xs font-bold text-ink hover:border-danger"
              >
                ×
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="overflow-hidden rounded-xl border border-line bg-bg">
              <Image
                src={
                  lang === "en"
                    ? "/images/flow-copilot-analytics-en.webp"
                    : "/images/flow-copilot-analytics.webp"
                }
                alt={c.title}
                width={380}
                height={212}
                className="h-auto w-full object-cover"
              />
            </div>

            {mode === "analyst" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted">{c.analystSection.crumb} ›</p>
                <div className="ml-auto max-w-[85%] rounded-2xl bg-sky-500/15 px-3.5 py-2.5 text-sm text-ink">
                  {c.analystSection.question}
                </div>
                <div className="rounded-2xl border-2 border-indigo-400/50 bg-bg p-3.5 text-sm shadow-sm">
                  <p className="text-ink">
                    <strong>{c.analystSection.answerBold}</strong> {c.analystSection.answerRest}
                  </p>
                  <p className="mt-2 text-ink">
                    <strong>{c.analystSection.recLabel}</strong> {c.analystSection.recBody}
                  </p>
                </div>

                {/* Kazanç-Kayıp Analizi Funnel Bars */}
                <div className="space-y-1.5 rounded-xl border border-line bg-bg p-3">
                  {c.analystSection.funnelStages.map((st) => (
                    <div key={st.label} className="grid grid-cols-[120px_1fr_38px] items-center gap-2 text-xs">
                      <span className="truncate text-muted">{st.label}</span>
                      <div className="h-3.5 w-full overflow-hidden rounded bg-surface">
                        <div className={`h-full rounded ${st.color}`} style={{ width: `${st.pct}%` }} />
                      </div>
                      <span className="text-right font-semibold text-ink tabular-nums">{st.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === "sources" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted">{c.sourcesSection.crumb} ›</p>
                <div className="ml-auto max-w-[85%] rounded-2xl bg-sky-500/15 px-3.5 py-2.5 text-sm text-ink">
                  {c.sourcesSection.question}
                </div>
                <div className="rounded-2xl border-2 border-indigo-400/50 bg-bg p-3.5 text-sm shadow-sm">
                  <h3 className="font-bold text-ink">{c.sourcesSection.heading}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted">{c.sourcesSection.subhead}</p>
                  <table className="mt-2.5 w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="py-1.5">{c.sourcesSection.colRank}</th>
                        <th className="py-1.5">{c.sourcesSection.colSource}</th>
                        <th className="py-1.5 text-right">{c.sourcesSection.colWon}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {c.sourcesSection.rows.map((row) => (
                        <tr key={row.rank}>
                          <td className="py-2 font-semibold">{row.rank}</td>
                          <td className="py-2 text-ink">{row.source}</td>
                          <td className="py-2 text-right font-bold tabular-nums">{row.won}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopySources()}
                      className="rounded border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand"
                    >
                      {copied ? c.sourcesSection.copiedBtn : c.sourcesSection.copyBtn}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === "overdue" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted">{c.overdueSection.crumb} ›</p>
                <div className="ml-auto max-w-[85%] rounded-2xl bg-sky-500/15 px-3.5 py-2.5 text-sm text-ink">
                  {c.overdueSection.question}
                </div>
                <div className="rounded-2xl border border-line bg-bg p-3.5 text-sm">
                  <h3 className="font-bold text-ink">{c.overdueSection.heading}</h3>
                  <p className="mt-1 text-xs text-muted">{c.overdueSection.subhead}</p>
                  <div className="mt-3 space-y-2">
                    {c.overdueSection.cards.map((card) => (
                      <div
                        key={card.name}
                        className="flex items-center justify-between rounded-xl border-2 border-indigo-400/50 bg-surface p-2.5"
                      >
                        <div>
                          <p className="text-xs font-semibold text-muted">{card.name}</p>
                          <p className="text-sm font-bold text-sky-600">{card.title}</p>
                          <span className="mt-1 inline-block rounded border border-line bg-bg px-2 py-0.5 text-[11px] text-muted">
                            {card.tag}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-rose-500">{card.age} ✨</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mode === "assistant" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted">{c.assistantSection.crumb} ›</p>
                <div className="rounded-2xl border border-line bg-bg p-3 text-sm space-y-2">
                  <div className="rounded-xl bg-surface p-2.5 text-xs text-ink">
                    {c.assistantSection.userMsg}
                  </div>
                  <div className="rounded-xl bg-sky-600 p-2.5 text-xs text-white">
                    ✨ {c.assistantSection.botMsg}
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-indigo-400/60 bg-bg p-3 text-xs">
                  <p className="font-bold text-ink">{c.assistantSection.taskBadge}</p>
                  <p className="mt-1 text-muted">{c.assistantSection.taskText}</p>
                </div>
              </div>
            )}

            {customReply && (
              <div
                role="status"
                className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-medium text-ink"
              >
                ✨ {customReply}
              </div>
            )}
          </div>

          {/* Footer Mode Switcher & Prompt Input */}
          <div className="border-t border-line p-3 space-y-2">
            <label className="block text-xs font-semibold text-muted">
              <span className="sr-only">{c.modeLabel}</span>
              <select
                aria-label={c.modeLabel}
                value={mode}
                onChange={(e) => setMode(e.target.value as CopilotMode)}
                className="w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs font-semibold text-ink"
              >
                <option value="analyst">{c.modes.analyst}</option>
                <option value="sources">{c.modes.sources}</option>
                <option value="overdue">{c.modes.overdue}</option>
                <option value="assistant">{c.modes.assistant}</option>
              </select>
            </label>

            <form onSubmit={handleAsk} className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={c.promptPlaceholder}
                className="flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-ink"
              />
              <button
                type="submit"
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-surface"
              >
                {c.askBtn}
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
