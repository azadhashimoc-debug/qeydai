"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { Tick } from "@/components/Tick";
import { buttonClass } from "@/components/ui/button";
import {
  formatPanelDateTime,
  type PanelDict,
  type PanelLocale,
  type PanelSession,
} from "./types";

type SessionsTabProps = {
  sessions: PanelSession[];
  lang: PanelLocale;
  d: PanelDict;
  onRefresh: () => Promise<void>;
  onUnauthorized: () => void;
};

export function SessionsTab({
  sessions,
  lang,
  d,
  onRefresh,
  onUnauthorized,
}: SessionsTabProps) {
  const [sessionId, setSessionId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("6");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string; field?: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [calView, setCalView] = useState<"day" | "week" | "month">("day");

  const idInputId = useId();
  const courseInputId = useId();
  const startsAtInputId = useId();
  const capacityInputId = useId();
  const statusId = useId();

  function toggleRoster(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const trimmedId = sessionId.trim();
    const trimmedCourse = courseId.trim();
    const parsedCap = Number.parseInt(capacity, 10);
    const parsedDate = startsAt ? new Date(startsAt) : null;

    if (!trimmedId || !trimmedCourse || !parsedDate || Number.isNaN(parsedDate.getTime()) || !Number.isFinite(parsedCap) || parsedCap < 1) {
      setFeedback({ kind: "error", text: d.sessions.errorInvalid });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/panel/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          id: trimmedId,
          courseId: trimmedCourse,
          startsAt: parsedDate.toISOString(),
          capacity: parsedCap,
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      if (res.status === 409) {
        setFeedback({ kind: "error", text: d.sessions.errorDuplicate, field: "id" });
        return;
      }

      if (res.status === 422) {
        const err = (await res.json().catch(() => ({}))) as { field?: string };
        setFeedback({ kind: "error", text: d.sessions.errorInvalid, field: err.field });
        return;
      }

      if (!res.ok) {
        setFeedback({ kind: "error", text: d.sessions.errorGeneric });
        return;
      }

      setSessionId("");
      setCourseId("");
      setStartsAt("");
      setCapacity("6");
      setFeedback({ kind: "ok", text: d.sessions.createOk });
      await onRefresh();
    } catch {
      setFeedback({ kind: "error", text: d.sessions.errorGeneric });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-md border border-line bg-bg px-3.5 py-2.5 text-ink placeholder:text-muted transition-[border-color] duration-150 focus:border-brand";

  return (
    <div className="grid gap-6">
      <header className="panel-card crm-section-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">{d.sessions.title}</h1>
            <p className="mt-1 text-[0.95rem] text-muted">{d.sessions.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["day", "week", "month"] as const).map((v) => {
              const label =
                lang === "az"
                  ? v === "day"
                    ? "GÜN"
                    : v === "week"
                      ? "HƏFTƏ"
                      : "AY"
                  : v.toUpperCase();
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalView(v)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold ${
                    calView === v
                      ? "border-brand bg-brand/10 text-ink"
                      : "border-line bg-bg text-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <span className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
              {lang === "az" ? "Mütəxəssislər: 3 · GMT +4" : "Specialists: 3 · GMT +4"}
            </span>
          </div>
        </div>
      </header>

      {/* Kommo Specialist Calendar Grid + Google Flow Visual */}
      <section className="panel-card grid gap-4 p-4 sm:grid-cols-[1.2fr_1fr] sm:items-center sm:p-5">
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <Image
            src={
              lang === "en"
                ? "/images/flow-calendar-booking-en.webp"
                : "/images/flow-calendar-booking.webp"
            }
            alt="Specialist Booking Calendar"
            width={560}
            height={312}
            className="h-auto w-full object-cover"
          />
        </div>
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {lang === "az"
              ? `✨ AI Təqvim Yoxlayıcısı · ${calView === "day" ? "Günlük" : calView === "week" ? "Həftəlik" : "Aylıq"} Cədvəl`
              : `✨ AI Calendar Guard · ${calView.toUpperCase()} Schedule`}
          </p>
          <div className="grid gap-2">
            {(sessions.length > 0 ? sessions.slice(0, 3) : []).map((s, idx) => (
              <div
                key={s.id}
                className="rounded-xl border border-indigo-400/50 bg-indigo-500/15 p-3 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-ink">
                  <span>{s.courseId}</span>
                  <span>
                    {8 + idx * 2}:00 — {9 + idx * 2}:30
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {s.taken}/{s.capacity} {d.sessions.takenOf} · {s.id}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Create session card */}
      <section className="panel-register crm-form-card p-5 sm:p-6">
        <h2 className="border-b border-line pb-3 text-lg font-semibold">{d.sessions.createTitle}</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
          <div className="min-w-0">
            <label htmlFor={idInputId} className="block text-sm font-semibold text-ink">
              {d.sessions.idLabel}
            </label>
            <input
              id={idInputId}
              name="id"
              required
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder={d.sessions.idPlaceholder}
              aria-invalid={feedback?.field === "id"}
              className={`${inputClass}${feedback?.field === "id" ? " border-danger" : ""}`}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor={courseInputId} className="block text-sm font-semibold text-ink">
              {d.sessions.courseLabel}
            </label>
            <input
              id={courseInputId}
              name="courseId"
              required
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder={d.sessions.coursePlaceholder}
              aria-invalid={feedback?.field === "courseId"}
              className={`${inputClass}${feedback?.field === "courseId" ? " border-danger" : ""}`}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor={startsAtInputId} className="block text-sm font-semibold text-ink">
              {d.sessions.startsAtLabel}
            </label>
            <input
              id={startsAtInputId}
              name="startsAt"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              aria-invalid={feedback?.field === "startsAt"}
              className={`${inputClass}${feedback?.field === "startsAt" ? " border-danger" : ""}`}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor={capacityInputId} className="block text-sm font-semibold text-ink">
              {d.sessions.capacityLabel}
            </label>
            <input
              id={capacityInputId}
              name="capacity"
              type="number"
              min={1}
              max={200}
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              aria-invalid={feedback?.field === "capacity"}
              className={`${inputClass}${feedback?.field === "capacity" ? " border-danger" : ""}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
            <p
              id={statusId}
              role="status"
              aria-live="polite"
              className={`min-h-5 text-sm font-medium ${
                feedback?.kind === "ok"
                  ? "text-stamp"
                  : feedback?.kind === "error"
                    ? "text-danger"
                    : "text-muted"
              }`}
            >
              {feedback?.text ?? ""}
            </p>
            <button
              type="submit"
              disabled={submitting}
              className={buttonClass({ size: "md", className: "min-h-11 w-full sm:w-auto" })}
            >
              {submitting ? d.sessions.creating : d.sessions.createSubmit}
            </button>
          </div>
        </form>
      </section>

      {/* Sessions list */}
      <section className="panel-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <h2 className="text-lg font-semibold">{d.sessions.listTitle}</h2>
          <span className="font-hand text-2xl font-bold text-pen tabular-nums">{sessions.length}</span>
        </div>

        {sessions.length === 0 ? (
          <p className="mt-4 text-[0.95rem] text-muted">{d.sessions.empty}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {sessions.map((s) => {
              const isFull = s.seatsLeft <= 0;
              const isLow = s.seatsLeft > 0 && s.seatsLeft <= 2;
              const isExpanded = expandedIds.has(s.id);
              const showCells = s.capacity > 0 && s.capacity <= 10;

              return (
                <li key={s.id} className="py-4 first:pt-3 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-ink">{s.courseId}</h3>
                        <span className="rounded border border-line bg-bg px-2 py-0.5 text-xs text-muted">
                          {s.id}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted tabular-nums">
                        {formatPanelDateTime(s.startsAt, lang)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {showCells && (
                        <span className="cells" aria-hidden="true">
                          {Array.from({ length: s.capacity }, (_, idx) => {
                            const taken = idx < s.taken;
                            const lastOpen = !isFull && isLow && idx === s.taken;
                            return (
                              <span key={idx} className={`cell ${lastOpen ? "cell--last" : ""}`}>
                                {taken && <Tick />}
                              </span>
                            );
                          })}
                        </span>
                      )}

                      <span className="text-sm font-medium text-ink tabular-nums">
                        {s.taken}/{s.capacity} {d.sessions.takenOf}
                      </span>

                      <span
                        className={`rounded px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          isFull
                            ? "border border-line bg-bg text-muted"
                            : isLow
                              ? "bg-marker text-cover"
                              : "border border-stamp/35 bg-stamp/10 text-stamp"
                        }`}
                      >
                        {isFull ? d.sessions.full : `${s.seatsLeft} ${d.sessions.seatsLeft}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleRoster(s.id)}
                        aria-expanded={isExpanded}
                        className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-11 sm:min-h-9" })}
                      >
                        {isExpanded ? d.sessions.rosterToggleHide : d.sessions.rosterToggleShow} ({s.enrollments.length})
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 rounded-md border border-line bg-bg p-4">
                      <h4 className="text-sm font-semibold text-ink">{d.sessions.rosterTitle}</h4>
                      {s.enrollments.length === 0 ? (
                        <p className="mt-1.5 text-sm text-muted">{d.sessions.rosterEmpty}</p>
                      ) : (
                        <ul className="mt-2 divide-y divide-line">
                          {s.enrollments.map((enr) => (
                            <li
                              key={enr.id}
                              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-ink">{enr.name}</span>
                                <span className="ml-2 text-muted tabular-nums">{enr.phone}</span>
                              </div>
                              <span className="text-xs text-muted tabular-nums">
                                {d.sessions.enrolledAt}: {formatPanelDateTime(enr.createdAt, lang)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
