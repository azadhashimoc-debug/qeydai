"use client";

import { useEffect, useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { LEAD_SOURCES, LEAD_STAGES, type LeadRecord, type PanelLocale, type PanelSession, type SalesDeal } from "./types";

type CopilotMode = "analyst" | "sources" | "overdue" | "assistant";

const COPY = {
  az: {
    triggerBtn: "✨ Copilot",
    title: "panelim.az Copilot",
    newChat: "Yeni təhlil",
    expand: "Genişləndir",
    close: "Copilot pəncərəsini bağla",
    modeLabel: "Copilot rejimi",
    modes: {
      analyst: "Analist modu — Canlı Qazanc-İtki Analizi",
      sources: "Qaynaq Bazında Performans",
      overdue: "Açıq və Sahibsiz Müraciətlər",
      assistant: "Sınaq Dərsi Boş Yer Vəziyyəti",
    },
    stages: {
      new: "Yeni",
      contacted: "Əlaqə quruldu",
      trial_booked: "Sınaq təyin edildi",
      paid: "Ödəniş edildi",
      lost: "İtirildi",
    },
    sources: {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      telegram: "Telegram",
      web: "Veb sayt",
      manual: "Əl ilə",
    },
    analystSection: {
      crumb: "Canlı CRM xülasəsi · Qazanc-İtki Qıfı",
      question: "Hazırkı qıf vəziyyəti və ödənişli dönüşüm necədir?",
      empty: "Hələ CRM müraciəti yoxdur. İlk müraciətlər əlavə olunduqca canlı göstəricilər burada görünəcək.",
      recLabel: "Təklif:",
    },
    sourcesSection: {
      crumb: "Canlı qaynaq bölgüsü",
      question: "Müraciətlər və anlaşmalar hansı kanallardan gəlir?",
      heading: "📣 Kanallara Görə Canlı Performans",
      colRank: "SIRALAMA",
      colSource: "QAYNAQ",
      colWon: "SAY",
      empty: "Hələ kanal statistikası yoxdur.",
      copyBtn: "📋 Siyahını kopyala",
      copiedBtn: "✓ Kopyalandı",
    },
    overdueSection: {
      crumb: "Öncəlikli İşlər",
      question: "Təcili cavab və ya təyinat gözləyən anlaşmalar hansılardır?",
      heading: "📊 Sahibsiz / Açıq Anlaşmalar",
      empty: "Hazırda gözləyən sahibsiz anlaşma və ya yeni müraciət yoxdur.",
      unassigned: "Təyin edilməyib",
    },
    assistantSection: {
      crumb: "Canlı Sınaq Dərsi Təqvimi",
      empty: "Aktiv sınaq dərsi sessiyası tapılmadı. Sessiyalar bölməsindən yeni qrup əlavə edin.",
      seatsLeft: "boş yer",
      nextSlot: "Ən yaxın açıq sessiya:",
      summaryLabel: "Ümumi tutum:",
    },
    promptPlaceholder: "Copilot-a sual verin...",
    askBtn: "Soruş",
  },
  en: {
    triggerBtn: "✨ Copilot",
    title: "panelim.az Copilot",
    newChat: "New analysis",
    expand: "Expand",
    close: "Close Copilot drawer",
    modeLabel: "Copilot mode",
    modes: {
      analyst: "Analyst mode — Live Win-Loss Funnel",
      sources: "Performance by Channel Source",
      overdue: "Open & Unassigned Deals",
      assistant: "Live Trial Session Availability",
    },
    stages: {
      new: "New",
      contacted: "Contacted",
      trial_booked: "Trial booked",
      paid: "Paid",
      lost: "Lost",
    },
    sources: {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      telegram: "Telegram",
      web: "Website",
      manual: "Manual",
    },
    analystSection: {
      crumb: "Live CRM summary · Win-Loss Funnel",
      question: "How does our current funnel and paid conversion look?",
      empty: "No CRM leads yet. Live funnel percentages will populate as inquiries arrive.",
      recLabel: "Recommendation:",
    },
    sourcesSection: {
      crumb: "Live channel breakdown",
      question: "Which channels are bringing leads and deals?",
      heading: "📣 Live Performance by Source",
      colRank: "RANK",
      colSource: "SOURCE",
      colWon: "COUNT",
      empty: "No channel data recorded yet.",
      copyBtn: "📋 Copy list",
      copiedBtn: "✓ Copied",
    },
    overdueSection: {
      crumb: "Priority Queue",
      question: "Which deals or leads need immediate attention?",
      heading: "📊 Unassigned / Open Items",
      empty: "No unassigned deals or new leads waiting right now.",
      unassigned: "Unassigned",
    },
    assistantSection: {
      crumb: "Live Trial Session Calendar",
      empty: "No active trial sessions found. Add a group in the Sessions tab.",
      seatsLeft: "seats left",
      nextSlot: "Next open session:",
      summaryLabel: "Total open capacity:",
    },
    promptPlaceholder: "Ask Copilot...",
    askBtn: "Ask",
  },
} as const;

const STAGE_COLORS: Record<(typeof LEAD_STAGES)[number], string> = {
  new: "bg-blue-500/25",
  contacted: "bg-amber-400/35",
  trial_booked: "bg-purple-500/30",
  paid: "bg-lime-500/40",
  lost: "bg-rose-400/30",
};

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

  const funnelStats = useMemo(() => {
    const total = leads.length;
    const paid = leads.filter((l) => l.stage === "paid").length;
    const conversionPct = total > 0 ? Math.round((paid / total) * 100) : 0;
    const newCount = leads.filter((l) => l.stage === "new").length;
    const rows = LEAD_STAGES.map((stage) => {
      const count = leads.filter((l) => l.stage === stage).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { stage, label: c.stages[stage], count, pct, color: STAGE_COLORS[stage] };
    });
    return { total, paid, newCount, conversionPct, rows };
  }, [leads, c]);

  const sourceRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const src of LEAD_SOURCES) counts.set(src, 0);
    for (const l of leads) counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
    for (const d of deals) counts.set(d.source, (counts.get(d.source) ?? 0) + 1);
    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count], idx) => ({
        rank: `#${idx + 1}`,
        source: c.sources[source as keyof typeof c.sources] ?? source,
        count,
      }));
  }, [leads, deals, c]);

  const priorityItems = useMemo(() => {
    const unassignedDeals = deals.filter((d) => !d.assigneeId).slice(0, 5);
    if (unassignedDeals.length > 0) {
      return unassignedDeals.map((d) => ({
        id: d.id,
        name: d.contactName,
        title: d.title,
        tag: c.sources[d.source as keyof typeof c.sources] ?? d.source,
        meta: c.overdueSection.unassigned,
      }));
    }
    return leads
      .filter((l) => l.stage === "new")
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        name: l.name,
        title: l.phone,
        tag: c.sources[l.source] ?? l.source,
        meta: c.stages[l.stage],
      }));
  }, [deals, leads, c]);

  const sessionStats = useMemo(() => {
    const totalSeatsLeft = sessions.reduce((sum, s) => sum + Math.max(0, s.seatsLeft), 0);
    const openSession = sessions.find((s) => s.seatsLeft > 0) ?? null;
    return { totalSeatsLeft, openSession };
  }, [sessions]);

  function handleAsk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = prompt.trim();
    if (!q) return;
    const topSrc = sourceRows[0]?.source ?? (lang === "az" ? "yoxdur" : "none");
    const summary =
      lang === "az"
        ? `Canlı iş sahəsi xülasəsi: ${deals.length} anlaşma, ${leads.length} müraciət (${funnelStats.paid} ödənişli, ${funnelStats.conversionPct}% dönüşüm), ${sessions.length} sessiyada ${sessionStats.totalSeatsLeft} boş yer. Ən aktiv kanal: ${topSrc}. Sorğu: "${q}".`
        : `Live workspace summary: ${deals.length} deals, ${leads.length} leads (${funnelStats.paid} paid, ${funnelStats.conversionPct}% conversion), ${sessionStats.totalSeatsLeft} open seats across ${sessions.length} sessions. Top channel: ${topSrc}. Query: "${q}".`;
    setCustomReply(summary);
    setPrompt("");
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleCopySources() {
    const text = sourceRows.map((r) => `${r.rank} ${r.source}: ${r.count}`).join("\n");
    if (text && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        // Ignore clipboard permission denial safely.
      }
    }
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
          className={`fixed top-16 right-4 bottom-4 z-50 flex flex-col rounded-xl border border-line bg-surface shadow-2xl transition-all ${
            expanded ? "w-[min(640px,calc(100vw-2rem))]" : "w-[min(410px,calc(100vw-2rem))]"
          }`}
        >
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

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {mode === "analyst" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted">{c.analystSection.crumb} ›</p>
                <div className="ml-auto max-w-[85%] rounded-2xl bg-sky-500/15 px-3.5 py-2.5 text-sm text-ink">
                  {c.analystSection.question}
                </div>
                {funnelStats.total === 0 ? (
                  <p className="rounded-2xl border border-line bg-bg p-3.5 text-sm text-muted">
                    {c.analystSection.empty}
                  </p>
                ) : (
                  <>
                    <div className="rounded-2xl border border-brand/30 bg-bg p-3.5 text-sm shadow-sm">
                      <p className="text-ink">
                        {lang === "az"
                          ? `Cəmi ${funnelStats.total} müraciət və ${deals.length} anlaşma var. Ödənişə dönüşüm: ${funnelStats.conversionPct}% (${funnelStats.paid} ödənişli).`
                          : `${funnelStats.total} total leads and ${deals.length} deals tracked. Paid conversion: ${funnelStats.conversionPct}% (${funnelStats.paid} paid).`}
                      </p>
                      <p className="mt-2 text-ink">
                        <strong>{c.analystSection.recLabel}</strong>{" "}
                        {funnelStats.newCount > 0
                          ? lang === "az"
                            ? `${funnelStats.newCount} yeni müraciət cavab gözləyir.`
                            : `${funnelStats.newCount} new leads are waiting for first contact.`
                          : lang === "az"
                            ? "Bütün yeni müraciətlər işlənib."
                            : "All new leads have been contacted."}
                      </p>
                    </div>
                    <div className="space-y-1.5 rounded-xl border border-line bg-bg p-3">
                      {funnelStats.rows.map((st) => (
                        <div key={st.stage} className="grid grid-cols-[120px_1fr_54px] items-center gap-2 text-xs">
                          <span className="truncate text-muted">{st.label}</span>
                          <div className="h-3.5 w-full overflow-hidden rounded bg-surface">
                            <div className={`h-full rounded ${st.color}`} style={{ width: `${st.pct}%` }} />
                          </div>
                          <span className="text-right font-semibold text-ink tabular-nums">
                            {st.count} ({st.pct}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {mode === "sources" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted">{c.sourcesSection.crumb} ›</p>
                <div className="ml-auto max-w-[85%] rounded-2xl bg-sky-500/15 px-3.5 py-2.5 text-sm text-ink">
                  {c.sourcesSection.question}
                </div>
                {sourceRows.length === 0 ? (
                  <p className="rounded-2xl border border-line bg-bg p-3.5 text-sm text-muted">
                    {c.sourcesSection.empty}
                  </p>
                ) : (
                  <div className="rounded-2xl border border-brand/30 bg-bg p-3.5 text-sm shadow-sm">
                    <h3 className="font-bold text-ink">{c.sourcesSection.heading}</h3>
                    <table className="mt-2.5 w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th className="py-1.5">{c.sourcesSection.colRank}</th>
                          <th className="py-1.5">{c.sourcesSection.colSource}</th>
                          <th className="py-1.5 text-right">{c.sourcesSection.colWon}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {sourceRows.map((row) => (
                          <tr key={row.source}>
                            <td className="py-2 font-semibold">{row.rank}</td>
                            <td className="py-2 text-ink">{row.source}</td>
                            <td className="py-2 text-right font-bold tabular-nums">{row.count}</td>
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
                )}
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
                  {priorityItems.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">{c.overdueSection.empty}</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {priorityItems.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center justify-between rounded-xl border border-line bg-surface p-2.5"
                        >
                          <div>
                            <p className="text-xs font-semibold text-muted">{card.name}</p>
                            <p className="text-sm font-bold text-sky-600">{card.title}</p>
                            <span className="mt-1 inline-block rounded border border-line bg-bg px-2 py-0.5 text-[11px] text-muted">
                              {card.tag}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-rose-500">{card.meta}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mode === "assistant" && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted">{c.assistantSection.crumb} ›</p>
                {sessions.length === 0 ? (
                  <p className="rounded-2xl border border-line bg-bg p-3.5 text-sm text-muted">
                    {c.assistantSection.empty}
                  </p>
                ) : (
                  <div className="rounded-2xl border border-line bg-bg p-3.5 text-sm space-y-2">
                    <p className="text-xs font-semibold text-ink">
                      {c.assistantSection.summaryLabel} {sessionStats.totalSeatsLeft} {c.assistantSection.seatsLeft} ({sessions.length})
                    </p>
                    {sessionStats.openSession && (
                      <div className="rounded-xl bg-surface p-2.5 text-xs text-ink">
                        <strong>{c.assistantSection.nextSlot}</strong>{" "}
                        {sessionStats.openSession.courseId} · {sessionStats.openSession.startsAt} ({sessionStats.openSession.seatsLeft} {c.assistantSection.seatsLeft})
                      </div>
                    )}
                  </div>
                )}
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
