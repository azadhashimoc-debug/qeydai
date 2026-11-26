"use client";

import { useId, useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import {
  formatPanelDateTime,
  LEAD_SOURCES,
  LEAD_STAGES,
  stageBadgeClass,
  type LeadRecord,
  type LeadSource,
  type LeadStage,
  type PanelDict,
  type PanelLocale,
} from "./types";

type LeadsTabProps = {
  leads: LeadRecord[];
  lang: PanelLocale;
  d: PanelDict;
  onLeadCreated: (lead: LeadRecord) => void;
  onLeadUpdated: (lead: LeadRecord) => void;
  onOpenInbox: (leadId: string) => void;
  onUnauthorized: () => void;
};

export function LeadsTab({
  leads,
  lang,
  d,
  onLeadCreated,
  onLeadUpdated,
  onOpenInbox,
  onUnauthorized,
}: LeadsTabProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSource, setNewSource] = useState<LeadSource>("manual");
  const [newStage, setNewStage] = useState<LeadStage>("new");
  const [newNote, setNewNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | LeadStage>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | LeadSource>("all");

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [rowFeedback, setRowFeedback] = useState<Record<string, { kind: "ok" | "error"; text: string }>>({});

  const nameId = useId();
  const phoneId = useId();
  const sourceId = useId();
  const stageId = useId();
  const noteId = useId();
  const searchId = useId();
  const filterStageId = useId();
  const filterSourceId = useId();

  const stageCounts = useMemo(() => {
    const counts: Record<LeadStage, number> = {
      new: 0,
      contacted: 0,
      trial_booked: 0,
      paid: 0,
      lost: 0,
    };
    for (const l of leads) {
      counts[l.stage] = (counts[l.stage] ?? 0) + 1;
    }
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.note.toLowerCase().includes(q)
      );
    });
  }, [leads, query, stageFilter, sourceFilter]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateStatus(null);
    const trimmedName = newName.trim();
    const trimmedPhone = newPhone.trim();
    if (trimmedName.length < 2 || trimmedPhone.replace(/\D/g, "").length < 7) {
      setCreateStatus({ kind: "error", text: d.leads.createError });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/panel/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          source: newSource,
          stage: newStage,
          note: newNote.trim(),
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      if (!res.ok) {
        setCreateStatus({ kind: "error", text: d.leads.createError });
        return;
      }

      const data = (await res.json()) as { ok: true; lead: LeadRecord };
      onLeadCreated(data.lead);
      setNewName("");
      setNewPhone("");
      setNewSource("manual");
      setNewStage("new");
      setNewNote("");
      setCreateStatus({ kind: "ok", text: d.leads.createOk });
    } catch {
      setCreateStatus({ kind: "error", text: d.leads.createError });
    } finally {
      setCreating(false);
    }
  }

  async function patchLead(leadId: string, patch: { stage?: LeadStage; note?: string }) {
    setSavingLeadId(leadId);
    setRowFeedback((prev) => {
      const next = { ...prev };
      delete next[leadId];
      return next;
    });

    try {
      const res = await fetch(`/api/panel/leads/${encodeURIComponent(leadId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(patch),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      if (!res.ok) {
        setRowFeedback((prev) => ({
          ...prev,
          [leadId]: { kind: "error", text: d.leads.updateError },
        }));
        return;
      }

      const data = (await res.json()) as { ok: true; lead: LeadRecord };
      onLeadUpdated(data.lead);
      if (patch.note !== undefined) {
        setNoteDrafts((prev) => {
          const next = { ...prev };
          delete next[leadId];
          return next;
        });
      }
      setRowFeedback((prev) => ({
        ...prev,
        [leadId]: { kind: "ok", text: d.leads.noteSaved },
      }));
    } catch {
      setRowFeedback((prev) => ({
        ...prev,
        [leadId]: { kind: "error", text: d.leads.updateError },
      }));
    } finally {
      setSavingLeadId(null);
    }
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-md border border-line bg-bg px-3.5 py-2 text-ink placeholder:text-muted transition-[border-color] duration-150 focus:border-brand";

  return (
    <div className="grid gap-6">
      <header className="panel-card crm-section-heading flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">{d.leads.title}</h1>
          <p className="mt-1 text-[0.95rem] text-muted">{d.leads.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((v) => !v);
            setCreateStatus(null);
          }}
          aria-expanded={showCreate}
          className={buttonClass({
            variant: showCreate ? "secondary" : "primary",
            size: "md",
            className: "min-h-11 w-full sm:w-auto",
          })}
        >
          {showCreate ? d.leads.newToggleClose : `+ ${d.leads.newToggleOpen}`}
        </button>
      </header>

      {showCreate && (
        <section className="panel-register crm-form-card p-5 sm:p-6">
          <h2 className="border-b border-line pb-3 text-lg font-semibold">{d.leads.createTitle}</h2>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
            <div className="min-w-0">
              <label htmlFor={nameId} className="block text-sm font-semibold text-ink">
                {d.leads.nameLabel}
              </label>
              <input
                id={nameId}
                name="name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={d.leads.namePlaceholder}
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor={phoneId} className="block text-sm font-semibold text-ink">
                {d.leads.phoneLabel}
              </label>
              <input
                id={phoneId}
                name="phone"
                type="tel"
                inputMode="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder={d.leads.phonePlaceholder}
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor={sourceId} className="block text-sm font-semibold text-ink">
                {d.leads.sourceLabel}
              </label>
              <select
                id={sourceId}
                value={newSource}
                onChange={(e) => setNewSource(e.target.value as LeadSource)}
                className={inputClass}
              >
                {LEAD_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {d.sources[src]}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor={stageId} className="block text-sm font-semibold text-ink">
                {d.leads.stageLabel}
              </label>
              <select
                id={stageId}
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as LeadStage)}
                className={inputClass}
              >
                {LEAD_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {d.stages[st]}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0 sm:col-span-2">
              <label htmlFor={noteId} className="block text-sm font-semibold text-ink">
                {d.leads.noteLabel}
              </label>
              <input
                id={noteId}
                name="note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={d.leads.notePlaceholder}
                className={inputClass}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-3">
              <p
                role="status"
                aria-live="polite"
                className={`min-h-5 text-sm font-medium ${
                  createStatus?.kind === "ok"
                    ? "text-stamp"
                    : createStatus?.kind === "error"
                      ? "text-danger"
                      : "text-muted"
                }`}
              >
                {createStatus?.text ?? ""}
              </p>
              <button
                type="submit"
                disabled={creating}
                className={buttonClass({ size: "md", className: "min-h-11 w-full sm:w-auto" })}
              >
                {creating ? d.leads.creating : d.leads.createSubmit}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Stage summary strip */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStageFilter("all")}
          aria-pressed={stageFilter === "all"}
          className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
            stageFilter === "all"
              ? "border-brand bg-brand text-white"
              : "border-line bg-surface text-ink hover:border-brand"
          }`}
        >
          {d.leads.allStages} <span className="ml-1 tabular-nums opacity-80">({leads.length})</span>
        </button>
        {LEAD_STAGES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStageFilter(st)}
            aria-pressed={stageFilter === st}
            className={`min-h-11 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
              stageFilter === st
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-ink hover:border-brand"
            }`}
          >
            {d.stages[st]} <span className="ml-1 tabular-nums opacity-80">({stageCounts[st]})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <section className="panel-card crm-form-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="min-w-0">
            <label htmlFor={searchId} className="block text-xs font-semibold uppercase tracking-wide text-muted">
              {d.leads.searchLabel}
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={d.leads.searchPlaceholder}
              className={inputClass}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor={filterStageId} className="block text-xs font-semibold uppercase tracking-wide text-muted">
              {d.leads.filterStageLabel}
            </label>
            <select
              id={filterStageId}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as "all" | LeadStage)}
              className={inputClass}
            >
              <option value="all">{d.leads.allStages}</option>
              {LEAD_STAGES.map((st) => (
                <option key={st} value={st}>
                  {d.stages[st]}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor={filterSourceId} className="block text-xs font-semibold uppercase tracking-wide text-muted">
              {d.leads.filterSourceLabel}
            </label>
            <select
              id={filterSourceId}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as "all" | LeadSource)}
              className={inputClass}
            >
              <option value="all">{d.leads.allSources}</option>
              {LEAD_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {d.sources[src]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Lead list */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between text-sm text-muted">
          <span className="tabular-nums">
            {filteredLeads.length} {d.leads.countSuffix}
          </span>
        </div>

        {leads.length === 0 ? (
          <div className="panel-card p-6 text-center text-muted">{d.leads.empty}</div>
        ) : filteredLeads.length === 0 ? (
          <div className="panel-card flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-muted">{d.leads.emptyFiltered}</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStageFilter("all");
                setSourceFilter("all");
              }}
              className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
            >
              {d.leads.clearFilters}
            </button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {filteredLeads.map((lead) => {
              const draftNote = noteDrafts[lead.id] ?? lead.note;
              const isNoteDirty = draftNote !== lead.note;
              const isSaving = savingLeadId === lead.id;
              const fb = rowFeedback[lead.id];
              const stageSelectId = `lead-stage-${lead.id}`;
              const noteInputId = `lead-note-${lead.id}`;

              return (
                <li key={lead.id} className="panel-card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Identity & meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-ink">{lead.name}</h2>
                        <span className="rounded border border-line bg-bg px-2 py-0.5 text-xs font-semibold text-muted">
                          {d.sources[lead.source]}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-xs font-semibold ${stageBadgeClass(
                            lead.stage
                          )}`}
                        >
                          {d.stages[lead.stage]}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                        <span className="font-medium text-ink tabular-nums">{lead.phone}</span>
                        <span className="tabular-nums">
                          {d.leads.updatedAt}: {formatPanelDateTime(lead.updatedAt, lang)}
                        </span>
                      </div>

                      {/* Note editor */}
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <label htmlFor={noteInputId} className="block text-xs font-semibold text-muted">
                            {d.leads.noteLabel}
                          </label>
                          <input
                            id={noteInputId}
                            value={draftNote}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))
                            }
                            placeholder={d.leads.notePlaceholder}
                            className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!isNoteDirty || isSaving}
                          onClick={() => patchLead(lead.id, { note: draftNote })}
                          className={buttonClass({
                            variant: "secondary",
                            size: "sm",
                            className: "min-h-11 shrink-0",
                          })}
                        >
                          {isSaving ? d.leads.noteSaving : d.leads.noteSave}
                        </button>
                      </div>
                    </div>

                    {/* Stage selector & Inbox jump */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end lg:flex-col lg:items-stretch lg:min-w-52">
                      <div className="min-w-0 flex-1">
                        <label htmlFor={stageSelectId} className="block text-xs font-semibold text-muted">
                          {d.leads.stageLabel}
                        </label>
                        <select
                          id={stageSelectId}
                          aria-label={d.leads.stageSelectAria}
                          disabled={isSaving}
                          value={lead.stage}
                          onChange={(e) =>
                            patchLead(lead.id, { stage: e.target.value as LeadStage })
                          }
                          className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium text-ink focus:border-brand"
                        >
                          {LEAD_STAGES.map((st) => (
                            <option key={st} value={st}>
                              {d.stages[st]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenInbox(lead.id)}
                        className={buttonClass({
                          variant: "primary",
                          size: "sm",
                          className: "min-h-11 shrink-0",
                        })}
                      >
                        {d.leads.openInInbox}
                      </button>
                    </div>
                  </div>

                  {fb && (
                    <p
                      role="status"
                      aria-live="polite"
                      className={`mt-2 text-xs font-medium ${
                        fb.kind === "ok" ? "text-stamp" : "text-danger"
                      }`}
                    >
                      {fb.text}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
