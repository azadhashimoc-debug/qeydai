"use client";

import { useState } from "react";
import { Tick } from "@/components/Tick";
import { buttonClass } from "@/components/ui/button";
import {
  formatPanelDateTime,
  LEAD_STAGES,
  stageBadgeClass,
  type LeadStage,
  type OverviewPayload,
  type PanelDict,
  type PanelLocale,
  type PanelTabId,
} from "./types";

type OverviewTabProps = {
  overview: OverviewPayload;
  lang: PanelLocale;
  d: PanelDict;
  onNavigate: (tab: PanelTabId) => void;
};

function stageBarColor(stage: LeadStage): string {
  switch (stage) {
    case "paid":
      return "bg-stamp";
    case "trial_booked":
      return "bg-marker";
    case "contacted":
      return "bg-brand";
    case "lost":
      return "bg-danger";
    case "new":
    default:
      return "bg-muted";
  }
}

export function OverviewTab({ overview, lang, d, onNavigate }: OverviewTabProps) {
  const [homeMode, setHomeMode] = useState<"ask" | "build" | "analyze">("ask");
  const [prompt, setPrompt] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState<string | null>(null);

  const paidCount = overview.leadsByStage.paid ?? 0;
  const conversionPct =
    overview.totalLeads > 0 ? Math.round((paidCount / overview.totalLeads) * 100) : 0;

  const { analytics } = overview;
  const utmEntries = Object.entries(analytics.byUtmSource).sort((a, b) => b[1] - a[1]);
  const ctaEntries = Object.entries(analytics.byCtaLocation).sort((a, b) => b[1] - a[1]);
  const expEntries = Object.entries(analytics.byExperiment);

  const funnelSteps = [
    { key: "views", label: d.overview.funnelViews, value: analytics.pageViews },
    { key: "cta", label: d.overview.funnelCta, value: analytics.ctaClicks },
    { key: "started", label: d.overview.funnelStarted, value: analytics.leadFormStarted },
    { key: "submitted", label: d.overview.funnelSubmitted, value: analytics.leadFormSubmitted },
  ];
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.value));

  const homeCopy =
    lang === "en"
      ? {
          greeting: "Welcome back!",
          subtitle: "What's on your mind today?",
          tabs: { ask: "Ask", build: "Build", analyze: "Analyze" },
          placeholder: "Ask a question about Panelim...",
          suggestions: [
            { label: "How do I connect WhatsApp?", tab: "channels" as PanelTabId },
            { label: "How do I set up an AI assistant?", tab: "ai" as PanelTabId },
            { label: "How do I manage deals & pipelines?", tab: "deals" as PanelTabId },
          ],
          reply: (q: string) =>
            `Workspace snapshot for "${q}": ${overview.totalLeads} leads, ${overview.totalEnrollments} trial bookings, ${paidCount} paid (${conversionPct}%), and ${overview.totalMessages} messages.`,
        }
      : {
          greeting: "Xoş gəldiniz!",
          subtitle: "Bu gün nə üzərində işləyək?",
          tabs: { ask: "Soruş", build: "Qur", analyze: "Analiz et" },
          placeholder: "Panelim haqqında sual verin...",
          suggestions: [
            { label: "WhatsApp necə qoşulur?", tab: "channels" as PanelTabId },
            { label: "AI köməkçisi necə qurulur?", tab: "ai" as PanelTabId },
            { label: "Satış mərhələləri necə idarə olunur?", tab: "deals" as PanelTabId },
          ],
          reply: (q: string) =>
            `"${q}" üzrə iş sahəsi xülasəsi: ${overview.totalLeads} müraciət, ${overview.totalEnrollments} sınaq qeydiyyatı, ${paidCount} ödənişli (${conversionPct}%) və ${overview.totalMessages} mesaj.`,
        };

  function handleHomePromptSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = prompt.trim();
    if (!q) return;
    setAssistantAnswer(homeCopy.reply(q));
  }

  return (
    <div className="grid gap-6">
      {/* Kommo 2026 Home AI Hero */}
      <section className="kommo-home-hero" aria-label="Home assistant">
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-2xl"
          aria-hidden="true"
        >
          <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none">
            <defs>
              <linearGradient id="wave-hand" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="55%" stopColor="#c4b5fd" />
                <stop offset="100%" stopColor="#e0e7ff" />
              </linearGradient>
            </defs>
            <path
              d="M18 11a2.5 2.5 0 0 1 5 0v12h1V8.5a2.5 2.5 0 0 1 5 0V23h1V11.5a2.5 2.5 0 0 1 5 0V27c0 7.5-4.8 13-12 13-5.8 0-10-4-11.7-9.6l-2.8-7.7a2.4 2.4 0 0 1 4.4-1.8L16 25V14.5a2.5 2.5 0 0 1 2-3.5z"
              fill="url(#wave-hand)"
              stroke="#4c8bf5"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <p className="text-xl font-bold text-ink sm:text-2xl">{homeCopy.greeting}</p>
          <p className="mt-1 text-sm text-muted sm:text-base">{homeCopy.subtitle}</p>
        </div>

        <div className="kommo-home-tabs" role="group" aria-label="Assistant mode">
          {(["ask", "build", "analyze"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setHomeMode(mode)}
              className={`kommo-home-tab ${homeMode === mode ? "is-active" : ""}`}
            >
              {homeCopy.tabs[mode]}
            </button>
          ))}
        </div>

        <form onSubmit={handleHomePromptSubmit} className="kommo-home-prompt">
          <div className="kommo-home-prompt-inner">
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={homeCopy.placeholder}
              aria-label={homeCopy.placeholder}
              className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {homeCopy.tabs[homeMode]}
              </span>
              <button type="submit" className="kommo-home-send" aria-label={homeCopy.tabs[homeMode]}>
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M3.1 4.2a.75.75 0 0 1 .9-.2l13 5.25a.75.75 0 0 1 0 1.4l-13 5.25a.75.75 0 0 1-1-.95L4.9 10 3 5.05a.75.75 0 0 1 .1-.85z" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {assistantAnswer && (
          <p role="status" className="max-w-2xl rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink">
            {assistantAnswer}
          </p>
        )}

        <div className="kommo-home-suggestions">
          {homeCopy.suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onNavigate(s.tab)}
              className="kommo-home-suggestion"
            >
              <span className="mt-0.5 text-brand" aria-hidden="true">✦</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">{d.overview.title}</h1>
          <p className="mt-1 text-sm text-muted">{d.overview.subtitle}</p>
        </div>
      </div>

      {/* 4 KPI register cards */}
      <section aria-label={d.overview.title} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="panel-register p-5">
          <p className="text-sm font-medium text-muted">{d.overview.kpiLeads}</p>
          <p className="mt-2 font-hand text-3xl font-semibold leading-none text-ink tabular-nums">
            {overview.totalLeads}
          </p>
        </article>

        <article className="panel-register p-5">
          <p className="text-sm font-medium text-muted">{d.overview.kpiEnrollments}</p>
          <p className="mt-2 font-hand text-3xl font-semibold leading-none text-pen tabular-nums">
            {overview.totalEnrollments}
          </p>
        </article>

        <article className="panel-register p-5">
          <p className="text-sm font-medium text-muted">{d.overview.kpiPaid}</p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="font-hand text-3xl font-semibold leading-none text-stamp tabular-nums">
              {paidCount}
            </p>
            <span className="rounded border border-stamp/35 bg-stamp/10 px-2 py-0.5 text-xs font-semibold text-stamp tabular-nums">
              {conversionPct}% {d.overview.conversionLabel}
            </span>
          </div>
        </article>

        <article className="panel-register p-5">
          <p className="text-sm font-medium text-muted">{d.overview.kpiMessages}</p>
          <p className="mt-2 font-hand text-3xl font-semibold leading-none text-ink tabular-nums">
            {overview.totalMessages}
          </p>
        </article>
      </section>

      {/* Pipeline + Sessions occupancy */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CRM Pipeline */}
        <section className="panel-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h2 className="text-lg font-semibold">{d.overview.pipelineTitle}</h2>
            <button
              type="button"
              onClick={() => onNavigate("leads")}
              className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11 sm:min-h-0" })}
            >
              {d.overview.goToLeads}
            </button>
          </div>

          {overview.totalLeads === 0 ? (
            <p className="mt-4 text-[0.95rem] text-muted">{d.overview.pipelineEmpty}</p>
          ) : (
            <ul className="mt-4 grid gap-3.5">
              {LEAD_STAGES.map((stage) => {
                const count = overview.leadsByStage[stage] ?? 0;
                const pct = overview.totalLeads > 0 ? Math.round((count / overview.totalLeads) * 100) : 0;
                return (
                  <li key={stage} className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${stageBadgeClass(
                          stage
                        )}`}
                      >
                        {d.stages[stage]}
                      </span>
                      <span className="font-semibold text-ink tabular-nums">
                        {count} <span className="font-normal text-muted">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-bg">
                      <div
                        className={`h-full transition-[width] duration-300 ${stageBarColor(stage)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Sessions occupancy */}
        <section className="panel-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h2 className="text-lg font-semibold">{d.overview.sessionsTitle}</h2>
            <button
              type="button"
              onClick={() => onNavigate("sessions")}
              className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11 sm:min-h-0" })}
            >
              {d.overview.goToSessions}
            </button>
          </div>

          {overview.sessions.length === 0 ? (
            <p className="mt-4 text-[0.95rem] text-muted">{d.overview.sessionsEmpty}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {overview.sessions.map((s) => {
                const isLow = s.seatsLeft > 0 && s.seatsLeft <= 2;
                const isFull = s.seatsLeft <= 0;
                const showCells = s.capacity > 0 && s.capacity <= 10;
                const fillPct = s.capacity > 0 ? Math.min(100, Math.round((s.taken / s.capacity) * 100)) : 0;

                return (
                  <li key={s.id} className="grid gap-2 py-3.5 first:pt-2 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{s.courseId}</p>
                        <p className="text-sm text-muted tabular-nums">
                          {formatPanelDateTime(s.startsAt, lang)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted tabular-nums">
                          {s.taken}/{s.capacity}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${
                            isFull
                              ? "border border-line bg-bg text-muted"
                              : isLow
                                ? "bg-marker text-cover"
                                : "border border-stamp/35 bg-stamp/10 text-stamp"
                          }`}
                        >
                          {isFull ? d.overview.fullLabel : `${s.seatsLeft} ${d.overview.seatsLeftSuffix}`}
                        </span>
                      </div>
                    </div>

                    {showCells ? (
                      <div className="cells flex-wrap" aria-hidden="true">
                        {Array.from({ length: s.capacity }, (_, idx) => {
                          const isTaken = idx < s.taken;
                          const isLastOpen = !isFull && idx === s.taken && isLow;
                          return (
                            <span
                              key={idx}
                              className={`cell ${isLastOpen ? "cell--last" : ""}`}
                            >
                              {isTaken && <Tick />}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-2 w-full overflow-hidden rounded-full border border-line bg-bg">
                        <div className="h-full bg-brand" style={{ width: `${fillPct}%` }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Landing Funnel Analytics */}
      <section className="panel-card p-5 sm:p-6">
        <div className="border-b border-line pb-3">
          <h2 className="text-lg font-semibold">{d.overview.analyticsTitle}</h2>
          <p className="mt-0.5 text-sm text-muted">{d.overview.analyticsScopeNote}</p>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Funnel bars */}
          <div className="grid gap-3">
            {funnelSteps.map((step) => {
              const widthPct = Math.round((step.value / funnelMax) * 100);
              return (
                <div key={step.key} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-ink">{step.label}</span>
                    <span className="text-lg font-semibold text-pen tabular-nums">{step.value}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-bg">
                    <div className="h-full bg-brand" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-1 flex items-center justify-between border-t border-line pt-2.5 text-sm">
              <span className="text-muted">{d.overview.funnelFailed}</span>
              <span className="font-semibold text-danger tabular-nums">{analytics.leadFormFailed}</span>
            </div>
          </div>

          {/* Locale split, UTM, CTA placements */}
          <div className="grid gap-4">
            <div className="rounded-md border border-line bg-bg p-4">
              <h3 className="text-sm font-semibold text-ink">{d.overview.localeSplitTitle}</h3>
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div className="rounded border border-line bg-surface px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-muted">AZ</p>
                  <p className="mt-0.5 text-xl font-semibold text-ink tabular-nums">
                    {analytics.byLocale.az}
                  </p>
                </div>
                <div className="rounded border border-line bg-surface px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-muted">EN</p>
                  <p className="mt-0.5 text-xl font-semibold text-ink tabular-nums">
                    {analytics.byLocale.en}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-line bg-bg p-4">
              <h3 className="text-sm font-semibold text-ink">{d.overview.utmTitle}</h3>
              {utmEntries.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted">{d.overview.utmEmpty}</p>
              ) : (
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {utmEntries.slice(0, 5).map(([source, count]) => (
                    <li key={source} className="flex items-center justify-between gap-2">
                      <span className="truncate text-ink">{source}</span>
                      <span className="font-semibold text-pen tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-line bg-bg p-4">
              <h3 className="text-sm font-semibold text-ink">{d.overview.ctaLocationsTitle}</h3>
              {ctaEntries.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted">{d.overview.ctaLocationsEmpty}</p>
              ) : (
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {ctaEntries.slice(0, 5).map(([loc, count]) => (
                    <li key={loc} className="flex items-center justify-between gap-2">
                      <span className="truncate text-ink">{loc}</span>
                      <span className="font-semibold text-pen tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Experiments */}
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">{d.overview.experimentsTitle}</h3>
          {expEntries.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted">{d.overview.experimentsEmpty}</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {expEntries.map(([name, stats]) => (
                <div key={name} className="rounded-md border border-line bg-bg p-3.5 text-sm">
                  <p className="truncate font-semibold text-ink">{name}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 tabular-nums">
                    <div>
                      <dt className="text-xs text-muted">{d.overview.expViews}</dt>
                      <dd className="font-semibold">{stats.views}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{d.overview.expClicks}</dt>
                      <dd className="font-semibold">{stats.ctaClicks}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{d.overview.expLeads}</dt>
                      <dd className="font-semibold text-stamp">{stats.leads}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
