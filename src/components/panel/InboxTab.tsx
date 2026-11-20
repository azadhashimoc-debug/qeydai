"use client";

import { useId, useMemo, useRef, useState, useEffect } from "react";
import { buttonClass } from "@/components/ui/button";
import {
  formatPanelDateTime,
  LEAD_SOURCES,
  LEAD_STAGES,
  stageBadgeClass,
  type LeadRecord,
  type LeadSource,
  type LeadStage,
  type MessageRecord,
  type MessageSender,
  type PanelDict,
  type PanelLocale,
  type SalesPhoneMatch,
} from "./types";

type InboxTabProps = {
  leads: LeadRecord[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string | null) => void;
  onLeadUpdated: (lead: LeadRecord) => void;
  onMessageSent: () => void;
  phoneMatches?: SalesPhoneMatch[];
  onConfirmPhoneMatch?: (matchId: string) => Promise<void>;
  lang: PanelLocale;
  d: PanelDict;
  onUnauthorized: () => void;
};

export function InboxTab({
  leads,
  selectedLeadId,
  onSelectLead,
  onLeadUpdated,
  onMessageSent,
  phoneMatches = [],
  onConfirmPhoneMatch,
  lang,
  d,
  onUnauthorized,
}: InboxTabProps) {
  const [threadQuery, setThreadQuery] = useState("");
  const [messagesState, setMessagesState] = useState<{
    leadId: string | null;
    items: MessageRecord[];
    error: string | null;
  }>({ leadId: null, items: [], error: null });

  const [sender, setSender] = useState<MessageSender>("staff");
  const [channelOverride, setChannelOverride] = useState<{
    leadId: string;
    value: LeadSource;
  } | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [mobileShowDetail, setMobileShowDetail] = useState(Boolean(selectedLeadId));

  const searchId = useId();
  const stageSelectId = useId();
  const channelSelectId = useId();
  const bodyInputId = useId();
  const logEndRef = useRef<HTMLDivElement>(null);

  const sortedLeads = useMemo(
    () =>
      [...leads].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [leads]
  );

  const filteredThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    if (!q) return sortedLeads;
    return sortedLeads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.phone.toLowerCase().includes(q)
    );
  }, [sortedLeads, threadQuery]);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? sortedLeads[0] ?? null,
    [leads, selectedLeadId, sortedLeads]
  );

  const activeLeadId = activeLead?.id ?? null;
  const channel: LeadSource =
    activeLead && channelOverride?.leadId === activeLead.id
      ? channelOverride.value
      : activeLead?.source ?? "telegram";

  const messages = activeLeadId && messagesState.leadId === activeLeadId ? messagesState.items : [];
  const loadingMessages = Boolean(activeLeadId) && messagesState.leadId !== activeLeadId;
  const messagesError =
    activeLeadId && messagesState.leadId === activeLeadId ? messagesState.error : null;

  useEffect(() => {
    if (!activeLeadId) return;

    const controller = new AbortController();
    const targetLeadId = activeLeadId;

    void (async () => {
      try {
        const res = await fetch(
          `/api/panel/messages?leadId=${encodeURIComponent(targetLeadId)}`,
          { credentials: "same-origin", signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        if (!res.ok) {
          setMessagesState({ leadId: targetLeadId, items: [], error: d.inbox.messagesError });
          return;
        }
        const data = (await res.json()) as { ok: true; messages: MessageRecord[] };
        if (controller.signal.aborted) return;
        setMessagesState({ leadId: targetLeadId, items: data.messages, error: null });
      } catch (err) {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setMessagesState({ leadId: targetLeadId, items: [], error: d.inbox.messagesError });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [activeLeadId, d.inbox.messagesError, onUnauthorized]);

  async function handleStageChange(nextStage: LeadStage) {
    if (!activeLead) return;
    setUpdatingStage(true);
    try {
      const res = await fetch(`/api/panel/leads/${encodeURIComponent(activeLead.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ stage: nextStage }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { ok: true; lead: LeadRecord };
        onLeadUpdated(data.lead);
      }
    } finally {
      setUpdatingStage(false);
    }
  }

  async function sendMessage() {
    if (!activeLead) return;
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/panel/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          leadId: activeLead.id,
          body: trimmed,
          sender,
          channel,
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      if (!res.ok) {
        setSendError(d.inbox.sendError);
        return;
      }

      const data = (await res.json()) as { ok: true; message: MessageRecord };
      const sentLeadId = activeLead.id;
      setMessagesState((prev) => ({
        leadId: sentLeadId,
        items: prev.leadId === sentLeadId ? [...prev.items, data.message] : [data.message],
        error: null,
      }));
      setBody("");
      onMessageSent();
      requestAnimationFrame(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch {
      setSendError(d.inbox.sendError);
    } finally {
      setSending(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void sendMessage();
    }
  }

  const senderOptions: Array<{ value: MessageSender; label: string }> = [
    { value: "staff", label: d.inbox.senderStaff },
    { value: "ai", label: d.inbox.senderAi },
    { value: "student", label: d.inbox.senderStudent },
  ];

  const unconfirmedMatches = useMemo(
    () => phoneMatches.filter((m) => !m.confirmedAt),
    [phoneMatches]
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{d.inbox.title}</h1>
        <p className="mt-1 text-[0.95rem] text-muted">{d.inbox.subtitle}</p>
      </div>

      {unconfirmedMatches.length > 0 && (
        <section
          aria-label={d.phoneMatch.bannerTitle}
          data-testid="phone-match-banner"
          className="panel-card border-brand/50 bg-brand/5 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-ink">{d.phoneMatch.bannerTitle}</h2>
              <p className="mt-0.5 text-xs text-muted">{d.phoneMatch.bannerSubtitle}</p>
            </div>
          </div>
          {matchError && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {matchError}
            </p>
          )}
          <ul className="mt-3 grid gap-2">
            {unconfirmedMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs"
              >
                <span className="text-ink">
                  <strong>{m.contactName}</strong> · {m.channel} ({m.externalUserId}) →{" "}
                  <strong className="tabular-nums">{m.phoneNormalized}</strong>
                </span>
                {onConfirmPhoneMatch && (
                  <button
                    type="button"
                    disabled={confirmingMatchId === m.id}
                    onClick={async () => {
                      setMatchError(null);
                      setConfirmingMatchId(m.id);
                      try {
                        await onConfirmPhoneMatch(m.id);
                      } catch {
                        setMatchError(d.phoneMatch.error);
                      } finally {
                        setConfirmingMatchId(null);
                      }
                    }}
                    className={buttonClass({ size: "sm", className: "min-h-9 text-xs" })}
                  >
                    {confirmingMatchId === m.id ? d.phoneMatch.confirming : d.phoneMatch.confirm}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {leads.length === 0 ? (
        <div className="panel-card p-6 text-center text-muted">{d.inbox.emptyThreads}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
          {/* Thread list */}
          <aside
            aria-label={d.inbox.threadsTitle}
            className={`panel-card min-w-0 overflow-hidden ${
              mobileShowDetail ? "hidden lg:block" : "block"
            }`}
          >
            <div className="crm-inbox-heading border-b border-line p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{d.inbox.threadsTitle}</h2>
                <span className="font-hand text-xl font-bold text-pen tabular-nums">
                  {filteredThreads.length}
                </span>
              </div>
              <div className="mt-3">
                <label htmlFor={searchId} className="sr-only">
                  {d.inbox.searchLabel}
                </label>
                <input
                  id={searchId}
                  type="search"
                  value={threadQuery}
                  onChange={(e) => setThreadQuery(e.target.value)}
                  placeholder={d.inbox.searchPlaceholder}
                  className="min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand"
                />
              </div>
            </div>

            <ul className="max-h-[34rem] divide-y divide-line overflow-y-auto">
              {filteredThreads.map((lead) => {
                const isSelected = activeLead?.id === lead.id;
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLead(lead.id);
                        setMobileShowDetail(true);
                      }}
                      aria-current={isSelected ? "true" : undefined}
                      className={`flex min-h-11 w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-(--crm-lavender) shadow-[inset_3px_0_var(--pen)]"
                          : "hover:bg-bg"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-ink">{lead.name}</span>
                        <span className="shrink-0 rounded border border-line bg-bg px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted">
                          {d.sources[lead.source]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted tabular-nums">{lead.phone}</span>
                        <span
                          className={`shrink-0 rounded border px-1.5 py-0.5 text-[0.7rem] font-semibold ${stageBadgeClass(
                            lead.stage
                          )}`}
                        >
                          {d.stages[lead.stage]}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Active conversation */}
          <section
            aria-label={activeLead?.name ?? d.inbox.title}
            className={`panel-register min-w-0 overflow-hidden ${
              mobileShowDetail ? "block" : "hidden lg:block"
            }`}
          >
            {!activeLead ? (
              <div className="p-8 text-center text-muted">{d.inbox.selectPrompt}</div>
            ) : (
              <div className="flex flex-col">
                {/* Conversation header */}
                <div className="crm-inbox-heading flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setMobileShowDetail(false)}
                      className="mb-2 inline-flex min-h-11 items-center gap-1 rounded border border-line bg-surface px-3 text-sm font-semibold text-ink lg:hidden"
                    >
                      ← {d.inbox.backToThreads}
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-ink">{activeLead.name}</h2>
                      <span className="rounded border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                        {d.sources[activeLead.source]}
                      </span>
                    </div>
                    <p className="text-sm text-muted tabular-nums">{activeLead.phone}</p>
                  </div>

                  <div className="w-full sm:w-auto sm:min-w-44">
                    <label htmlFor={stageSelectId} className="block text-xs font-semibold text-muted">
                      {d.inbox.stageLabel}
                    </label>
                    <select
                      id={stageSelectId}
                      disabled={updatingStage}
                      value={activeLead.stage}
                      onChange={(e) => void handleStageChange(e.target.value as LeadStage)}
                      className="mt-1 min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink focus:border-brand"
                    >
                      {LEAD_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {d.stages[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Message log */}
                <div className="crm-conversation flex min-h-[18rem] max-h-[26rem] flex-col gap-3 overflow-y-auto p-4 sm:p-5">
                  {loadingMessages ? (
                    <p className="my-auto text-center text-sm text-muted">{d.inbox.loadingMessages}</p>
                  ) : messagesError ? (
                    <p role="alert" className="my-auto text-center text-sm font-medium text-danger">
                      {messagesError}
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="my-auto text-center text-sm text-muted">{d.inbox.messagesEmpty}</p>
                  ) : (
                    messages.map((msg) => {
                      const isInbound = msg.direction === "in" || msg.sender === "student";
                      const isAi = !isInbound && msg.sender === "ai";
                      const bubbleStyle = isInbound
                        ? "self-start border border-line bg-surface text-ink rounded-bl-sm"
                        : isAi
                          ? "self-end bg-cover/90 text-white rounded-br-sm"
                          : "self-end bg-brand text-white rounded-br-sm";

                      return (
                        <article
                          key={msg.id}
                          className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.95rem] leading-snug sm:max-w-[78%] ${bubbleStyle}`}
                        >
                          <div
                            className={`mb-1 flex flex-wrap items-center gap-2 text-xs ${
                              isInbound ? "text-muted" : "text-white/80"
                            }`}
                          >
                            <span className="font-semibold">{d.senders[msg.sender]}</span>
                            <span>·</span>
                            <span>{d.sources[msg.channel]}</span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {formatPanelDateTime(msg.createdAt, lang)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                        </article>
                      );
                    })
                  )}
                  <div ref={logEndRef} />
                </div>

                {/* Composer */}
                <form
                  onSubmit={handleFormSubmit}
                  className="grid gap-3 border-t border-line bg-surface p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <fieldset className="min-w-0 flex-1">
                      <legend className="text-xs font-semibold text-muted">
                        {d.inbox.senderRoleLabel}
                      </legend>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {senderOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSender(opt.value)}
                            aria-pressed={sender === opt.value}
                            className={`min-h-11 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-9 ${
                              sender === opt.value
                                ? opt.value === "staff"
                                  ? "border-brand bg-brand text-white"
                                  : opt.value === "ai"
                                    ? "border-cover bg-cover text-white"
                                    : "border-ink bg-marker text-cover"
                                : "border-line bg-bg text-ink hover:border-brand"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <div className="w-full sm:w-40">
                      <label htmlFor={channelSelectId} className="block text-xs font-semibold text-muted">
                        {d.inbox.channelLabel}
                      </label>
                      <select
                        id={channelSelectId}
                        value={channel}
                        onChange={(e) => {
                          if (activeLead) {
                            setChannelOverride({
                              leadId: activeLead.id,
                              value: e.target.value as LeadSource,
                            });
                          }
                        }}
                        className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-1.5 text-sm text-ink focus:border-brand sm:min-h-9"
                      >
                        {LEAD_SOURCES.map((src) => (
                          <option key={src} value={src}>
                            {d.sources[src]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={bodyInputId} className="sr-only">
                      {d.inbox.bodyLabel}
                    </label>
                    <textarea
                      id={bodyInputId}
                      rows={3}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={d.inbox.bodyPlaceholder}
                      className="w-full rounded-md border border-line bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p
                      role="status"
                      aria-live="polite"
                      className={`text-xs ${sendError ? "font-medium text-danger" : "text-muted"}`}
                    >
                      {sendError ?? d.inbox.sendHint}
                    </p>
                    <button
                      type="submit"
                      disabled={sending || !body.trim()}
                      className={buttonClass({ size: "md", className: "min-h-11 w-full sm:w-auto" })}
                    >
                      {sending ? d.inbox.sending : d.inbox.send}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
