"use client";

import { useId, useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { KanbanBoard } from "./KanbanBoard";
import {
  formatMoneyMinor,
  formatPanelDateTime,
  LEAD_SOURCES,
  localizeStageName,
  stageKindBadgeClass,
  type LeadSource,
  type PanelDict,
  type PanelLocale,
  type SalesContact,
  type SalesDeal,
  type SalesMember,
  type SalesStage,
} from "./types";

type DealListProps = {
  deals: SalesDeal[];
  stages: SalesStage[];
  contacts: SalesContact[];
  members: SalesMember[];
  currentMemberId: string | null;
  currency: string;
  lang: PanelLocale;
  d: PanelDict;
  onDealCreated: (deal: SalesDeal, contact?: SalesContact) => void;
  onDealUpdated: (deal: SalesDeal) => void;
  onOpenDeal: (dealId: string) => void;
  onUnauthorized: () => void;
};

export function DealList({
  deals,
  stages,
  contacts,
  members,
  currentMemberId,
  currency,
  lang,
  d,
  onDealCreated,
  onDealUpdated,
  onOpenDeal,
  onUnauthorized,
}: DealListProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "new");
  const [source, setSource] = useState<LeadSource>("manual");
  const [amountMajor, setAmountMajor] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [claimingDealId, setClaimingDealId] = useState<string | null>(null);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const titleId = useId();
  const contactSelectId = useId();
  const contactNameId = useId();
  const contactPhoneId = useId();
  const stageSelectId = useId();
  const sourceSelectId = useId();
  const amountId = useId();
  const searchId = useId();
  const filterStageId = useId();
  const filterSourceId = useId();
  const filterAssigneeId = useId();

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages]
  );
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);
  const memberNameById = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((deal) => {
      if (stageFilter !== "all" && deal.stageId !== stageFilter) return false;
      if (sourceFilter !== "all" && deal.source !== sourceFilter) return false;
      if (assigneeFilter === "unassigned" && deal.assigneeId !== null) return false;
      if (assigneeFilter === "mine" && (!currentMemberId || deal.assigneeId !== currentMemberId)) {
        return false;
      }
      if (
        assigneeFilter !== "all" &&
        assigneeFilter !== "unassigned" &&
        assigneeFilter !== "mine" &&
        deal.assigneeId !== assigneeFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        deal.title.toLowerCase().includes(q) ||
        (deal.contactName ?? "").toLowerCase().includes(q) ||
        (deal.contactPhone ?? "").toLowerCase().includes(q)
      );
    });
  }, [deals, query, stageFilter, sourceFilter, assigneeFilter, currentMemberId]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateStatus(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setCreateStatus({ kind: "error", text: d.deals.createError });
      return;
    }

    let resolvedContactId = selectedContactId;
    let createdContact: SalesContact | undefined;

    setCreating(true);
    try {
      if (!resolvedContactId) {
        const trimmedName = contactName.trim();
        const trimmedPhone = contactPhone.trim();
        if (trimmedName.length < 2 || trimmedPhone.replace(/\D/g, "").length < 7) {
          setCreateStatus({ kind: "error", text: d.deals.createError });
          setCreating(false);
          return;
        }
        const contactRes = await fetch("/api/panel/contacts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
        });
        if (contactRes.status === 401) {
          onUnauthorized();
          return;
        }
        if (!contactRes.ok) {
          setCreateStatus({ kind: "error", text: d.deals.createError });
          setCreating(false);
          return;
        }
        const contactJson = (await contactRes.json()) as { ok: true; contact: SalesContact };
        resolvedContactId = contactJson.contact.id;
        createdContact = contactJson.contact;
      }

      const parsedMajor = amountMajor.trim() ? Number(amountMajor.trim()) : 0;
      const amountMinor = Number.isFinite(parsedMajor) && parsedMajor >= 0 ? Math.round(parsedMajor * 100) : 0;

      const dealRes = await fetch("/api/panel/deals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: trimmedTitle,
          contactId: resolvedContactId,
          stageId: stageId || sortedStages[0]?.id || "new",
          source,
          amountMinor,
          currency,
        }),
      });
      if (dealRes.status === 401) {
        onUnauthorized();
        return;
      }
      if (!dealRes.ok) {
        if (createdContact) {
          try {
            await fetch(`/api/panel/contacts?id=${encodeURIComponent(createdContact.id)}`, {
              method: "DELETE",
              credentials: "same-origin",
            });
          } catch {
            /* orphan cleanup best-effort */
          }
        }
        setCreateStatus({ kind: "error", text: d.deals.createError });
        return;
      }
      const dealJson = (await dealRes.json()) as { ok: true; deal: SalesDeal };
      onDealCreated(dealJson.deal, createdContact);
      setTitle("");
      setSelectedContactId("");
      setContactName("");
      setContactPhone("");
      setAmountMajor("");
      setCreateStatus({ kind: "ok", text: d.deals.createOk });
      setShowCreate(false);
    } catch {
      setCreateStatus({ kind: "error", text: d.deals.createError });
    } finally {
      setCreating(false);
    }
  }

  async function handleMoveStage(dealId: string, nextStageId: string) {
    setActionError(null);
    setMovingDealId(dealId);
    try {
      const res = await fetch(`/api/panel/deals?id=${encodeURIComponent(dealId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ stageId: nextStageId }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setActionError(d.deals.updateError);
        return;
      }
      const data = (await res.json()) as { ok: true; deal: SalesDeal };
      onDealUpdated(data.deal);
    } catch {
      setActionError(d.deals.updateError);
    } finally {
      setMovingDealId(null);
    }
  }

  async function handleClaimDeal(dealId: string) {
    setActionError(null);
    setClaimingDealId(dealId);
    try {
      const res = await fetch(`/api/panel/deals/${encodeURIComponent(dealId)}/claim`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.status === 409) {
        setActionError(d.deals.claimConflict);
        return;
      }
      if (!res.ok) {
        setActionError(d.deals.updateError);
        return;
      }
      const data = (await res.json()) as { ok: true; deal: SalesDeal };
      onDealUpdated(data.deal);
    } catch {
      setActionError(d.deals.updateError);
    } finally {
      setClaimingDealId(null);
    }
  }

  const hasFilters =
    query.trim() !== "" ||
    stageFilter !== "all" ||
    sourceFilter !== "all" ||
    assigneeFilter !== "all";

  return (
    <div className="grid gap-6">
      <div className="panel-card crm-section-heading flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{d.deals.title}</h1>
          <p className="mt-1 text-[0.95rem] text-muted">{d.deals.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`min-h-9 rounded px-3 text-xs font-semibold transition-colors ${
                viewMode === "kanban" ? "bg-brand text-white" : "text-muted hover:text-ink"
              }`}
            >
              {d.deals.viewKanban}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`min-h-9 rounded px-3 text-xs font-semibold transition-colors ${
                viewMode === "list" ? "bg-brand text-white" : "text-muted hover:text-ink"
              }`}
            >
              {d.deals.viewList}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
            className={buttonClass({ size: "sm", className: "min-h-11 sm:min-h-9" })}
          >
            {showCreate ? d.deals.newToggleClose : d.deals.newToggleOpen}
          </button>
        </div>
      </div>

      {showCreate && (
        <section aria-label={d.deals.createTitle} className="panel-register crm-form-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">{d.deals.createTitle}</h2>
          <form onSubmit={(e) => void handleCreate(e)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor={titleId} className="block text-sm font-medium text-ink">
                {d.deals.titleLabel}
              </label>
              <input
                id={titleId}
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={d.deals.titlePlaceholder}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </div>

            <div>
              <label htmlFor={contactSelectId} className="block text-sm font-medium text-ink">
                {d.deals.contactLabel}
              </label>
              <select
                id={contactSelectId}
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              >
                <option value="">{d.deals.contactSelectPlaceholder}</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={stageSelectId} className="block text-sm font-medium text-ink">
                {d.deals.stageLabel}
              </label>
              <select
                id={stageSelectId}
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              >
                {sortedStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {localizeStageName(s, d)}
                  </option>
                ))}
              </select>
            </div>

            {!selectedContactId && (
              <>
                <div>
                  <label htmlFor={contactNameId} className="block text-sm font-medium text-ink">
                    {d.deals.contactNameLabel}
                  </label>
                  <input
                    id={contactNameId}
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={d.contacts.namePlaceholder}
                    className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label htmlFor={contactPhoneId} className="block text-sm font-medium text-ink">
                    {d.deals.contactPhoneLabel}
                  </label>
                  <input
                    id={contactPhoneId}
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={d.contacts.phonePlaceholder}
                    className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor={sourceSelectId} className="block text-sm font-medium text-ink">
                {d.deals.sourceLabel}
              </label>
              <select
                id={sourceSelectId}
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              >
                {LEAD_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {d.sources[src]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={amountId} className="block text-sm font-medium text-ink">
                {d.deals.amountLabel} ({currency})
              </label>
              <input
                id={amountId}
                type="number"
                min={0}
                step="0.01"
                value={amountMajor}
                onChange={(e) => setAmountMajor(e.target.value)}
                placeholder={d.deals.amountPlaceholder}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={creating}
                className={buttonClass({ size: "sm", className: "min-h-11" })}
              >
                {creating ? d.deals.creating : d.deals.createSubmit}
              </button>
            </div>
          </form>

          {createStatus && (
            <p
              role={createStatus.kind === "error" ? "alert" : "status"}
              className={`mt-3 text-sm font-medium ${
                createStatus.kind === "error" ? "text-danger" : "text-stamp"
              }`}
            >
              {createStatus.text}
            </p>
          )}
        </section>
      )}

      {/* Search & Filter bar */}
      <section className="panel-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={searchId} className="block text-xs font-semibold text-muted">
            {d.deals.searchLabel}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.deals.searchPlaceholder}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor={filterStageId} className="block text-xs font-semibold text-muted">
            {d.deals.filterStageLabel}
          </label>
          <select
            id={filterStageId}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
          >
            <option value="all">{d.deals.allStages}</option>
            {sortedStages.map((s) => (
              <option key={s.id} value={s.id}>
                {localizeStageName(s, d)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={filterSourceId} className="block text-xs font-semibold text-muted">
            {d.deals.filterSourceLabel}
          </label>
          <select
            id={filterSourceId}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
          >
            <option value="all">{d.deals.allSources}</option>
            {LEAD_SOURCES.map((src) => (
              <option key={src} value={src}>
                {d.sources[src]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={filterAssigneeId} className="block text-xs font-semibold text-muted">
            {d.deals.filterAssigneeLabel}
          </label>
          <select
            id={filterAssigneeId}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
          >
            <option value="all">{d.deals.allAssignees}</option>
            <option value="unassigned">{d.deals.unassignedOnly}</option>
            {currentMemberId && <option value="mine">{d.deals.mineOnly}</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {actionError && (
        <div role="alert" className="panel-card border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {actionError}
        </div>
      )}

      {deals.length === 0 ? (
        <div className="panel-card p-8 text-center text-muted">{d.deals.empty}</div>
      ) : filteredDeals.length === 0 ? (
        <div className="panel-card flex flex-col items-center gap-3 p-8 text-center text-muted">
          <p>{d.deals.emptyFiltered}</p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStageFilter("all");
                setSourceFilter("all");
                setAssigneeFilter("all");
              }}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {d.deals.clearFilters}
            </button>
          )}
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          stages={sortedStages}
          deals={filteredDeals}
          members={members}
          lang={lang}
          d={d}
          claimingDealId={claimingDealId}
          movingDealId={movingDealId}
          onMoveStage={(dealId, nextStageId) => void handleMoveStage(dealId, nextStageId)}
          onClaimDeal={(dealId) => void handleClaimDeal(dealId)}
          onOpenDeal={onOpenDeal}
        />
      ) : (
        <div className="grid gap-3" data-testid="deal-list">
          {filteredDeals.map((deal) => {
            const st = stageById.get(deal.stageId);
            const assigneeName = deal.assigneeId
              ? memberNameById.get(deal.assigneeId) ?? deal.assigneeId
              : null;
            return (
              <article
                key={deal.id}
                className="panel-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenDeal(deal.id)}
                      className="text-left text-base font-semibold text-ink hover:text-pen hover:underline"
                    >
                      {deal.title}
                    </button>
                    {st && (
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${stageKindBadgeClass(
                          st.kind
                        )}`}
                      >
                        {localizeStageName(st, d)}
                      </span>
                    )}
                    <span className="rounded border border-line bg-bg px-2 py-0.5 text-xs font-semibold text-muted">
                      {d.sources[deal.source] ?? deal.source}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {deal.contactName} · <span className="tabular-nums">{deal.contactPhone}</span> ·{" "}
                    <span className="font-semibold text-ink tabular-nums">
                      {formatMoneyMinor(deal.amountMinor, deal.currency)}
                    </span>{" "}
                    · {assigneeName ?? d.deals.unassigned} · {formatPanelDateTime(deal.updatedAt, lang)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={d.deals.moveStageAria}
                    value={deal.stageId}
                    disabled={movingDealId === deal.id}
                    onChange={(e) => void handleMoveStage(deal.id, e.target.value)}
                    className="min-h-11 rounded border border-line bg-bg px-2.5 py-1.5 text-sm text-ink sm:min-h-9"
                  >
                    {sortedStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {localizeStageName(s, d)}
                      </option>
                    ))}
                  </select>

                  {!deal.assigneeId && (
                    <button
                      type="button"
                      disabled={claimingDealId === deal.id}
                      onClick={() => void handleClaimDeal(deal.id)}
                      className={buttonClass({
                        variant: "secondary",
                        size: "sm",
                        className: "min-h-11 sm:min-h-9",
                      })}
                    >
                      {claimingDealId === deal.id ? d.deals.claiming : d.deals.claim}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenDeal(deal.id)}
                    className={buttonClass({ size: "sm", className: "min-h-11 sm:min-h-9" })}
                  >
                    {d.deals.openDetail}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
