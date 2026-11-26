"use client";

import { useCallback, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import {
  formatMoneyMinor,
  formatPanelDateTime,
  localizeStageName,
  stageKindBadgeClass,
  type PanelDict,
  type PanelLocale,
  type SalesDeal,
  type SalesMember,
  type SalesStage,
} from "./types";

type KanbanBoardProps = {
  stages: SalesStage[];
  deals: SalesDeal[];
  members: SalesMember[];
  lang: PanelLocale;
  d: PanelDict;
  claimingDealId: string | null;
  movingDealId: string | null;
  onMoveStage: (dealId: string, stageId: string) => void;
  onClaimDeal: (dealId: string) => void;
  onOpenDeal: (dealId: string) => void;
};

const STAGE_ACCENTS = ["#7CB8F7", "#F7E36D", "#F5A623", "#F48FB1", "#34D399", "#F87171"] as const;

export function KanbanBoard({
  stages,
  deals,
  members,
  lang,
  d,
  claimingDealId,
  movingDealId,
  onMoveStage,
  onClaimDeal,
  onOpenDeal,
}: KanbanBoardProps) {
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [focusedStageId, setFocusedStageId] = useState<string | null>(null);
  const [focusedDealId, setFocusedDealId] = useState<string | null>(null);

  const dealRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stageRefs = useRef<Map<string, HTMLElement>>(new Map());

  const memberNameById = new Map(members.map((m) => [m.id, m.name]));
  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  const stageIdList = sortedStages.map((s) => s.id);

  const dealIdsByStage = useCallback(
    (stageId: string) =>
      deals
        .filter((deal) => deal.stageId === stageId)
        .map((deal) => deal.id),
    [deals]
  );

  const moveFocus = useCallback(
    (stageId: string | null, dealId: string | null) => {
      setFocusedStageId(stageId);
      setFocusedDealId(dealId);
      if (dealId) {
        const el = dealRefs.current.get(dealId);
        el?.focus({ preventScroll: true });
      } else if (stageId) {
        const el = stageRefs.current.get(stageId);
        el?.focus({ preventScroll: true });
      }
    },
    []
  );

  function handleStageKeyDown(e: React.KeyboardEvent<HTMLElement>, stageId: string) {
      const idx = stageIdList.indexOf(stageId);
      if (idx === -1) return;
      let next: string | null = null;
      if (e.key === "ArrowRight") next = stageIdList[(idx + 1) % stageIdList.length];
      else if (e.key === "ArrowLeft") next = stageIdList[(idx - 1 + stageIdList.length) % stageIdList.length];
      else if (e.key === "Home") next = stageIdList[0];
      else if (e.key === "End") next = stageIdList[stageIdList.length - 1];
      else if (e.key === "ArrowDown") {
        const ids = dealIdsByStage(stageId);
        if (ids.length) {
          e.preventDefault();
          moveFocus(stageId, ids[0]);
          return;
        }
      }
      if (next) {
        e.preventDefault();
        moveFocus(next, null);
      }
  }

  function handleDealKeyDown(e: React.KeyboardEvent<HTMLElement>, deal: SalesDeal) {
      const stageIdx = stageIdList.indexOf(deal.stageId);
      if (stageIdx === -1) return;
      const ids = dealIdsByStage(deal.stageId);
      const dealIdx = ids.indexOf(deal.id);

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onOpenDeal(deal.id);
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        const nextStageId =
          e.key === "ArrowLeft"
            ? stageIdList[(stageIdx - 1 + stageIdList.length) % stageIdList.length]
            : stageIdList[(stageIdx + 1) % stageIdList.length];
        if (deal.stageId !== nextStageId) {
          onMoveStage(deal.id, nextStageId);
        }
        const nextIds = dealIdsByStage(nextStageId);
        const targetId = nextIds.includes(deal.id) ? deal.id : nextIds[0] ?? null;
        moveFocus(nextStageId, targetId);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        moveFocus(deal.stageId, null);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        if (!ids.length) return;
        const nextIdx = (dealIdx + 1) % ids.length;
        moveFocus(deal.stageId, ids[nextIdx]);
        return;
      }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-3" data-testid="kanban-board">
      {sortedStages.map((stage, stageIndex) => {
        const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
        const totalMinor = stageDeals.reduce((sum, item) => sum + item.amountMinor, 0);
        const currency = stageDeals[0]?.currency ?? "AZN";
        const isDropTarget = dragOverStageId === stage.id;
        const isFocusedStage = focusedStageId === stage.id;
        const accentColor =
          stage.kind === "won"
            ? "#34D399"
            : stage.kind === "lost"
              ? "#F87171"
              : STAGE_ACCENTS[stageIndex % STAGE_ACCENTS.length];

        return (
          <section
            key={stage.id}
            ref={(el) => {
              if (el) stageRefs.current.set(stage.id, el);
              else stageRefs.current.delete(stage.id);
            }}
            aria-label={localizeStageName(stage, d)}
            data-testid={`kanban-stage-${stage.id}`}
            tabIndex={0}
            onFocus={() => setFocusedStageId(stage.id)}
            onBlur={() => {
              if (focusedStageId === stage.id && !focusedDealId) setFocusedStageId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverStageId !== stage.id) setDragOverStageId(stage.id);
            }}
            onDragLeave={() => {
              if (dragOverStageId === stage.id) setDragOverStageId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverStageId(null);
              const id = dragDealId || e.dataTransfer.getData("text/plain");
              setDragDealId(null);
              if (id) {
                const dropped = deals.find((item) => item.id === id);
                if (dropped && dropped.stageId !== stage.id) {
                  onMoveStage(id, stage.id);
                }
              }
            }}
            onKeyDown={(e) => handleStageKeyDown(e, stage.id)}
            data-drop-target={isDropTarget}
            data-focus={isFocusedStage ? "true" : undefined}
            className="panel-card crm-sales-column flex w-72 shrink-0 flex-col gap-3 p-3 transition-colors"
          >
            <header
              className="flex flex-col items-center gap-1 pb-2.5 text-center"
              style={{ borderBottom: `2.5px solid ${accentColor}` }}
            >
              <div className="flex max-w-full items-center justify-center gap-2">
                <h2 className="truncate text-xs font-bold uppercase tracking-wide text-ink">
                  {localizeStageName(stage, d)}
                </h2>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums ${stageKindBadgeClass(
                    stage.kind
                  )}`}
                >
                  {stageDeals.length}
                </span>
              </div>
              <p className="text-xs font-medium text-muted tabular-nums">
                {formatMoneyMinor(totalMinor, currency)}
              </p>
            </header>

            <div className="flex flex-col gap-2.5">
              {stageDeals.map((deal) => {
                const assigneeName = deal.assigneeId
                  ? memberNameById.get(deal.assigneeId) ?? deal.assigneeId
                  : null;
                const isClaiming = claimingDealId === deal.id;
                const isMoving = movingDealId === deal.id;
                const isFocusedDeal = focusedDealId === deal.id;

                return (
                  <article
                    key={deal.id}
                    ref={(el) => {
                      if (el) dealRefs.current.set(deal.id, el);
                      else dealRefs.current.delete(deal.id);
                    }}
                    draggable
                    tabIndex={0}
                    onFocus={() => setFocusedDealId(deal.id)}
                    onBlur={() => {
                      if (focusedDealId === deal.id) setFocusedDealId(null);
                    }}
                    onDragStart={(e) => {
                      setDragDealId(deal.id);
                      e.dataTransfer.setData("text/plain", deal.id);
                    }}
                    onDragEnd={() => {
                      setDragDealId(null);
                      setDragOverStageId(null);
                    }}
                    onKeyDown={(e) => handleDealKeyDown(e, deal)}
                    data-testid={`deal-card-${deal.id}`}
                    data-focus={isFocusedDeal ? "true" : undefined}
                    className="rounded-xl border border-line bg-surface p-3 shadow-xs transition-colors hover:border-brand/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDeal(deal.id)}
                        className="min-w-0 text-left text-sm font-semibold text-ink hover:text-pen hover:underline"
                      >
                        {deal.title}
                      </button>
                      <span className="shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted">
                        {d.sources[deal.source] ?? deal.source}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-xs text-muted">
                      <span className="truncate font-medium text-ink">{deal.contactName}</span>
                      <span className="tabular-nums">{deal.contactPhone}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-ink tabular-nums">
                        {formatMoneyMinor(deal.amountMinor, deal.currency)}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[0.7rem] font-semibold ${
                          assigneeName
                            ? "border-brand/30 bg-brand/10 text-pen"
                            : "border-line bg-surface text-muted"
                        }`}
                      >
                        {assigneeName ?? d.deals.unassigned}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/70 pt-2">
                      <select
                        aria-label={`${d.deals.moveStageAria}: ${deal.title}`}
                        value={deal.stageId}
                        disabled={isMoving}
                        onChange={(e) => onMoveStage(deal.id, e.target.value)}
                        className="min-h-9 min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-xs font-medium text-ink"
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
                          disabled={isClaiming}
                          onClick={() => onClaimDeal(deal.id)}
                          className={buttonClass({
                            variant: "secondary",
                            size: "sm",
                            className: "min-h-9 px-2.5 text-xs",
                          })}
                        >
                          {isClaiming ? d.deals.claiming : d.deals.claim}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenDeal(deal.id)}
                        className={buttonClass({
                          size: "sm",
                          className: "min-h-9 px-2.5 text-xs",
                        })}
                      >
                        {d.deals.openDetail}
                      </button>
                    </div>

                    <p className="mt-1.5 text-[0.7rem] text-muted">
                      {formatPanelDateTime(deal.updatedAt, lang)}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
