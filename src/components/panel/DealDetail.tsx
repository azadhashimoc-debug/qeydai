"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import {
  formatMoneyMinor,
  formatPanelDateTime,
  localizeStageName,
  type PanelDict,
  type PanelLocale,
  type SalesDeal,
  type SalesDealFieldValue,
  type SalesFieldDef,
  type SalesMember,
  type SalesMemberRole,
  type SalesNote,
  type SalesStage,
  type SalesTask,
  type SalesTimelineEntry,
} from "./types";

type DealDetailProps = {
  deal: SalesDeal;
  stages: SalesStage[];
  members: SalesMember[];
  fieldDefs: SalesFieldDef[];
  actorRole: SalesMemberRole;
  lang: PanelLocale;
  d: PanelDict;
  onBack: () => void;
  onDealUpdated: (deal: SalesDeal) => void;
  onDealDeleted: (dealId: string) => void;
  onOpenContact: (contactId: string) => void;
  onUnauthorized: () => void;
};

export function DealDetail({
  deal,
  stages,
  members,
  fieldDefs,
  actorRole,
  lang,
  d,
  onBack,
  onDealUpdated,
  onDealDeleted,
  onOpenContact,
  onUnauthorized,
}: DealDetailProps) {
  const [subTab, setSubTab] = useState<"timeline" | "tasks" | "fields">("timeline");

  const [editTitle, setEditTitle] = useState(deal.title);
  const [editStageId, setEditStageId] = useState(deal.stageId);
  const [editAssigneeId, setEditAssigneeId] = useState(deal.assigneeId ?? "");
  const [editAmountMajor, setEditAmountMajor] = useState(
    deal.amountMinor > 0 ? String(deal.amountMinor / 100) : "0"
  );
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaStatus, setMetaStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [timeline, setTimeline] = useState<SalesTimelineEntry[]>([]);
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [notes, setNotes] = useState<SalesNote[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loadingSub, setLoadingSub] = useState(true);

  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const [newNoteBody, setNewNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [savingFields, setSavingFields] = useState(false);
  const [fieldsStatus, setFieldsStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const titleInputId = useId();
  const stageSelectId = useId();
  const assigneeSelectId = useId();
  const amountInputId = useId();
  const replyInputId = useId();
  const taskTitleId = useId();
  const taskDueId = useId();
  const noteInputId = useId();

  const loadSubResources = useCallback(async () => {
    try {
      const [tlRes, taskRes, noteRes, valRes] = await Promise.all([
        fetch(`/api/panel/deals/${encodeURIComponent(deal.id)}/timeline`, {
          credentials: "same-origin",
        }),
        fetch(`/api/panel/tasks?dealId=${encodeURIComponent(deal.id)}`, {
          credentials: "same-origin",
        }),
        fetch(`/api/panel/notes?dealId=${encodeURIComponent(deal.id)}`, {
          credentials: "same-origin",
        }),
        fetch(`/api/panel/deals/${encodeURIComponent(deal.id)}/fields`, {
          credentials: "same-origin",
        }),
      ]);

      if (
        tlRes.status === 401 ||
        taskRes.status === 401 ||
        noteRes.status === 401 ||
        valRes.status === 401
      ) {
        onUnauthorized();
        return;
      }

      if (tlRes.ok) {
        const tlJson = (await tlRes.json()) as { ok: true; timeline: SalesTimelineEntry[] };
        setTimeline(tlJson.timeline);
      }
      if (taskRes.ok) {
        const tJson = (await taskRes.json()) as { ok: true; tasks: SalesTask[] };
        setTasks(tJson.tasks);
      }
      if (noteRes.ok) {
        const nJson = (await noteRes.json()) as { ok: true; notes: SalesNote[] };
        setNotes(nJson.notes);
      }
      if (valRes.ok) {
        const vJson = (await valRes.json()) as { ok: true; values: SalesDealFieldValue[] };
        const map: Record<string, string> = {};
        for (const item of vJson.values) {
          map[item.fieldId] = item.value;
        }
        setFieldValues(map);
      }
    } catch {
      /* sub-resource load failure shown implicitly via empty state */
    } finally {
      setLoadingSub(false);
    }
  }, [deal.id, onUnauthorized]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadSubResources();
    });
    return () => { cancelled = true; };
  }, [loadSubResources]);

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  async function handleSaveMeta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMetaStatus(null);
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setMetaStatus({ kind: "error", text: d.deals.updateError });
      return;
    }
    const parsedMajor = Number(editAmountMajor);
    const amountMinor = Number.isFinite(parsedMajor) && parsedMajor >= 0 ? Math.round(parsedMajor * 100) : 0;

    const payload: Record<string, unknown> = {
      title: trimmed,
      stageId: editStageId,
      amountMinor,
    };
    if (actorRole !== "operator") {
      payload.assigneeId = editAssigneeId || null;
    }

    setSavingMeta(true);
    try {
      const res = await fetch(`/api/panel/deals?id=${encodeURIComponent(deal.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setMetaStatus({ kind: "error", text: d.deals.updateError });
        return;
      }
      const data = (await res.json()) as { ok: true; deal: SalesDeal };
      onDealUpdated(data.deal);
      setMetaStatus({ kind: "ok", text: d.deals.saved });
      void loadSubResources();
    } catch {
      setMetaStatus({ kind: "error", text: d.deals.updateError });
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    setMetaStatus(null);
    try {
      const res = await fetch(`/api/panel/deals/${encodeURIComponent(deal.id)}/claim`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.status === 409) {
        setMetaStatus({ kind: "error", text: d.deals.claimConflict });
        return;
      }
      if (!res.ok) {
        setMetaStatus({ kind: "error", text: d.deals.updateError });
        return;
      }
      const data = (await res.json()) as { ok: true; deal: SalesDeal };
      onDealUpdated(data.deal);
    } finally {
      setClaiming(false);
    }
  }

  async function handleDeleteDeal() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/panel/deals?id=${encodeURIComponent(deal.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        onDealDeleted(deal.id);
      } else {
        setMetaStatus({ kind: "error", text: d.deals.updateError });
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/panel/deals/${encodeURIComponent(deal.id)}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
        if (errJson?.error === "reply_window_expired") {
          setReplyError(d.deals.replyWindowExpired);
        } else if (errJson?.error === "no_thread") {
          setReplyError(d.deals.replyNoThread);
        } else {
          setReplyError(d.deals.replyError);
        }
        return;
      }
      setReplyBody("");
      await loadSubResources();
    } catch {
      setReplyError(d.deals.replyError);
    } finally {
      setSendingReply(false);
    }
  }

  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    setAddingTask(true);
    try {
      const res = await fetch("/api/panel/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          dealId: deal.id,
          title: trimmed,
          dueAt: newTaskDue ? new Date(newTaskDue).toISOString() : null,
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        setNewTaskTitle("");
        setNewTaskDue("");
        await loadSubResources();
      }
    } finally {
      setAddingTask(false);
    }
  }

  async function handleToggleTask(task: SalesTask) {
    const nextStatus = task.status === "done" ? "open" : "done";
    const res = await fetch(`/api/panel/tasks?id=${encodeURIComponent(task.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.status === 401) {
      onUnauthorized();
      return;
    }
    if (res.ok) {
      await loadSubResources();
    }
  }

  async function handleDeleteTask(taskId: string) {
    const res = await fetch(`/api/panel/tasks?id=${encodeURIComponent(taskId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.status === 401) {
      onUnauthorized();
      return;
    }
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  }

  async function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newNoteBody.trim();
    if (!trimmed) return;
    setAddingNote(true);
    try {
      const res = await fetch("/api/panel/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ dealId: deal.id, body: trimmed }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        setNewNoteBody("");
        await loadSubResources();
      }
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    const res = await fetch(`/api/panel/notes?id=${encodeURIComponent(noteId)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.status === 401) {
      onUnauthorized();
      return;
    }
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  }

  async function handleSaveFields(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingFields(true);
    setFieldsStatus(null);
    try {
      const values = fieldDefs.map((def) => ({
        fieldId: def.id,
        value: fieldValues[def.id] ?? "",
      }));
      const res = await fetch(`/api/panel/deals/${encodeURIComponent(deal.id)}/fields`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ values }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        setFieldsStatus({ kind: "error", text: d.deals.updateError });
        return;
      }
      setFieldsStatus({ kind: "ok", text: d.deals.fieldsSaved });
    } catch {
      setFieldsStatus({ kind: "error", text: d.deals.updateError });
    } finally {
      setSavingFields(false);
    }
  }

  function formatEventLabel(eventType: string): string {
    switch (eventType) {
      case "stage_changed":
        return d.deals.eventStageChanged;
      case "task_created":
        return d.deals.eventTaskCreated;
      case "task_done":
        return d.deals.eventTaskDone;
      case "note_added":
        return d.deals.eventNoteAdded;
      default:
        return eventType;
    }
  }

  return (
    <div className="grid gap-6" data-testid="deal-detail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
        >
          ← {d.deals.closeDetail}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {!deal.assigneeId && (
            <button
              type="button"
              disabled={claiming}
              onClick={() => void handleClaim()}
              className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
            >
              {claiming ? d.deals.claiming : d.deals.claim}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenContact(deal.contactId)}
            className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
          >
            {d.deals.openContact}
          </button>
          {actorRole !== "operator" && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="min-h-11 rounded-md border border-danger/40 bg-surface px-3 text-sm font-semibold text-danger hover:bg-danger/10 sm:min-h-9"
            >
              {d.deals.deleteDeal}
            </button>
          )}
          {confirmingDelete && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteDeal()}
                className="min-h-11 rounded-md bg-danger px-3 text-sm font-semibold text-white sm:min-h-9"
              >
                {d.deals.deleteConfirm}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11" })}
              >
                {d.deals.deleteCancel}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Deal summary + edit form */}
      <section className="panel-register crm-form-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">{deal.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {deal.contactName} · <span className="tabular-nums">{deal.contactPhone}</span> ·{" "}
              <span className="font-semibold text-ink tabular-nums">
                {formatMoneyMinor(deal.amountMinor, deal.currency)}
              </span>
            </p>
          </div>
          <span className="rounded border border-line bg-bg px-2.5 py-1 text-xs font-semibold text-muted">
            {d.sources[deal.source] ?? deal.source}
          </span>
        </div>

        <form onSubmit={(e) => void handleSaveMeta(e)} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={titleInputId} className="block text-xs font-semibold text-muted">
              {d.deals.titleLabel}
            </label>
            <input
              id={titleInputId}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor={stageSelectId} className="block text-xs font-semibold text-muted">
              {d.deals.stageLabel}
            </label>
            <select
              id={stageSelectId}
              value={editStageId}
              onChange={(e) => setEditStageId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {localizeStageName(s, d)}
                </option>
              ))}
            </select>
          </div>

          {actorRole !== "operator" && (
            <div>
              <label htmlFor={assigneeSelectId} className="block text-xs font-semibold text-muted">
                {d.deals.assigneeLabel}
              </label>
              <select
                id={assigneeSelectId}
                value={editAssigneeId}
                onChange={(e) => setEditAssigneeId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              >
                <option value="">{d.deals.unassigned}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor={amountInputId} className="block text-xs font-semibold text-muted">
              {d.deals.amountLabel} ({deal.currency})
            </label>
            <input
              id={amountInputId}
              type="number"
              min={0}
              step="0.01"
              value={editAmountMajor}
              onChange={(e) => setEditAmountMajor(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
            />
          </div>

          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={savingMeta} className={buttonClass({ size: "sm", className: "min-h-11" })}>
              {savingMeta ? d.deals.saving : d.deals.saveChanges}
            </button>
            {metaStatus && (
              <span
                role={metaStatus.kind === "error" ? "alert" : "status"}
                className={`text-sm font-medium ${
                  metaStatus.kind === "error" ? "text-danger" : "text-stamp"
                }`}
              >
                {metaStatus.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "timeline", label: d.deals.detailTabTimeline },
            { id: "tasks", label: `${d.deals.detailTabTasksNotes} (${tasks.length + notes.length})` },
            { id: "fields", label: d.deals.detailTabFields },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubTab(item.id)}
            className={`min-h-11 rounded-md border px-4 py-2 text-sm font-semibold transition-colors sm:min-h-9 ${
              subTab === item.id
                ? "border-ink bg-cover text-white"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loadingSub ? (
        <div className="panel-card p-6 text-center text-sm text-muted">{d.loading}</div>
      ) : subTab === "timeline" ? (
        <section className="panel-card grid gap-4 p-5">
          <h2 className="text-base font-semibold">{d.deals.timelineTitle}</h2>

          {timeline.length === 0 ? (
            <p className="text-sm text-muted">{d.deals.timelineEmpty}</p>
          ) : (
            <ul className="grid gap-2.5">
              {timeline.map((entry) =>
                entry.kind === "message" ? (
                  <li
                    key={`msg-${entry.id}`}
                    className={`rounded-lg border p-3 ${
                      entry.direction === "in"
                        ? "border-line bg-bg"
                        : "border-brand/30 bg-brand/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                      <span className="font-semibold text-ink">
                        {entry.sender} · {entry.channel} ({entry.direction})
                      </span>
                      <span>{formatPanelDateTime(entry.at, lang)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{entry.body}</p>
                  </li>
                ) : (
                  <li key={`ev-${entry.id}`} className="rounded-lg border border-dashed border-line bg-surface p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{formatEventLabel(entry.eventType)}</span>
                      <span className="text-muted">{formatPanelDateTime(entry.at, lang)}</span>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}

          <form onSubmit={(e) => void handleSendReply(e)} className="grid gap-3 border-t border-line pt-4">
            <label htmlFor={replyInputId} className="text-sm font-semibold text-ink">
              {d.deals.replyLabel}
            </label>
            <textarea
              id={replyInputId}
              rows={3}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={d.deals.replyPlaceholder}
              className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
            />
            {replyError && (
              <p role="alert" className="text-sm font-medium text-danger">
                {replyError}
              </p>
            )}
            <div>
              <button
                type="submit"
                disabled={sendingReply || !replyBody.trim()}
                className={buttonClass({ size: "sm", className: "min-h-11" })}
              >
                {sendingReply ? d.deals.replySending : d.deals.replySend}
              </button>
            </div>
          </form>
        </section>
      ) : subTab === "tasks" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tasks */}
          <section className="panel-card grid gap-4 p-5">
            <h2 className="text-base font-semibold">{d.deals.tasksTitle}</h2>
            <form onSubmit={(e) => void handleAddTask(e)} className="grid gap-2.5">
              <div>
                <label htmlFor={taskTitleId} className="block text-xs font-semibold text-muted">
                  {d.deals.taskTitleLabel}
                </label>
                <input
                  id={taskTitleId}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={d.deals.taskTitlePlaceholder}
                  className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-44 flex-1">
                  <label htmlFor={taskDueId} className="block text-xs font-semibold text-muted">
                    {d.deals.taskDueLabel}
                  </label>
                  <input
                    id={taskDueId}
                    type="datetime-local"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingTask || !newTaskTitle.trim()}
                  className={buttonClass({ size: "sm", className: "min-h-11" })}
                >
                  {d.deals.taskAdd}
                </button>
              </div>
            </form>

            {tasks.length === 0 ? (
              <p className="text-sm text-muted">{d.deals.tasksEmpty}</p>
            ) : (
              <ul className="grid gap-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-bg p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          task.status === "done" ? "line-through text-muted" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.dueAt && (
                        <p className="text-xs text-muted">{formatPanelDateTime(task.dueAt, lang)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleToggleTask(task)}
                        className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-9 text-xs" })}
                      >
                        {task.status === "done" ? d.deals.taskReopen : d.deals.taskMarkDone}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTask(task.id)}
                        className="min-h-9 rounded border border-line bg-surface px-2.5 text-xs font-semibold text-danger hover:border-danger"
                      >
                        {d.deals.taskDelete}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section className="panel-card grid gap-4 p-5">
            <h2 className="text-base font-semibold">{d.deals.notesTitle}</h2>
            <form onSubmit={(e) => void handleAddNote(e)} className="grid gap-2.5">
              <label htmlFor={noteInputId} className="block text-xs font-semibold text-muted">
                {d.deals.noteLabel}
              </label>
              <textarea
                id={noteInputId}
                rows={3}
                value={newNoteBody}
                onChange={(e) => setNewNoteBody(e.target.value)}
                placeholder={d.deals.notePlaceholder}
                className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
              <div>
                <button
                  type="submit"
                  disabled={addingNote || !newNoteBody.trim()}
                  className={buttonClass({ size: "sm", className: "min-h-11" })}
                >
                  {d.deals.noteAdd}
                </button>
              </div>
            </form>

            {notes.length === 0 ? (
              <p className="text-sm text-muted">{d.deals.notesEmpty}</p>
            ) : (
              <ul className="grid gap-2">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-md border border-line bg-bg p-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span>{formatPanelDateTime(note.createdAt, lang)}</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteNote(note.id)}
                        className="font-semibold text-danger hover:underline"
                      >
                        {d.deals.noteDelete}
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <section className="panel-card grid gap-4 p-5">
          <h2 className="text-base font-semibold">{d.deals.fieldsTitle}</h2>
          {fieldDefs.length === 0 ? (
            <p className="text-sm text-muted">{d.deals.fieldsEmpty}</p>
          ) : (
            <form onSubmit={(e) => void handleSaveFields(e)} className="grid gap-4 sm:grid-cols-2">
              {fieldDefs.map((def) => {
                const val = fieldValues[def.id] ?? "";
                const fieldInputId = `deal-custom-field-${def.id}`;
                return (
                  <div key={def.id}>
                    <label htmlFor={fieldInputId} className="block text-sm font-medium text-ink">
                      {def.name}
                      {def.required && <span className="ml-1 text-danger">*</span>}
                    </label>
                    {def.kind === "boolean" ? (
                      <input
                        id={fieldInputId}
                        type="checkbox"
                        checked={val === "true"}
                        onChange={(e) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [def.id]: e.target.checked ? "true" : "false",
                          }))
                        }
                        className="mt-2 h-5 w-5"
                      />
                    ) : (
                      <input
                        id={fieldInputId}
                        type={def.kind === "number" ? "number" : def.kind === "date" ? "date" : "text"}
                        required={def.required}
                        value={val}
                        onChange={(e) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [def.id]: e.target.value,
                          }))
                        }
                        className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingFields}
                  className={buttonClass({ size: "sm", className: "min-h-11" })}
                >
                  {savingFields ? d.deals.fieldsSaving : d.deals.fieldsSave}
                </button>
                {fieldsStatus && (
                  <span
                    role={fieldsStatus.kind === "error" ? "alert" : "status"}
                    className={`text-sm font-medium ${
                      fieldsStatus.kind === "error" ? "text-danger" : "text-stamp"
                    }`}
                  >
                    {fieldsStatus.text}
                  </span>
                )}
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
