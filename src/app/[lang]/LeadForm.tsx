"use client";
import { useCallback, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { extractUtmProps, type Locale } from "@/lib/analytics/events";
import { getActiveExperimentToken } from "@/lib/experiments/ab";

type Labels = {
  name: string;
  namePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  submit: string;
  sending: string;
  privacy: string;
  nameRequired: string;
};

export function LeadForm({
  locale,
  labels,
  okText,
  errText,
  rateLimitedText,
}: {
  locale: Locale;
  labels: Labels;
  okText: string;
  errText: string;
  rateLimitedText: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error" | "name_error" | "limited">("idle");
  const startedRef = useRef(false);
  const nameId = useId();
  const phoneId = useId();
  const statusId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const markStarted = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent({ event: "lead_form_started", props: { locale, exp: getActiveExperimentToken() } });
  }, [locale]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    markStarted();
    const fd = new FormData(e.currentTarget);
    const rawName = String(fd.get("name") ?? "").trim();
    const rawPhone = String(fd.get("phone") ?? "").trim();

    if (rawName.length < 2) {
      setState("name_error");
      trackEvent({ event: "lead_form_failed", props: { locale, reason: "name_required" } });
      nameRef.current?.focus();
      return;
    }

    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length < 9) {
      setState("error");
      trackEvent({ event: "lead_form_failed", props: { locale, reason: "invalid_phone" } });
      phoneRef.current?.focus();
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: rawName, phone: rawPhone }),
      });
      if (res.ok) {
        setState("ok");
        const { utm_source, utm_medium, utm_campaign } = extractUtmProps(window.location.search);
        trackEvent({
          event: "lead_form_submitted",
          props: {
            locale,
            exp: getActiveExperimentToken(),
            ...(utm_source ? { utm_source } : {}),
            ...(utm_medium ? { utm_medium } : {}),
            ...(utm_campaign ? { utm_campaign } : {}),
          },
        });
      } else if (res.status === 429) {
        setState("limited");
        trackEvent({ event: "lead_form_failed", props: { locale, reason: "rate_limited" } });
      } else {
        setState("error");
        trackEvent({
          event: "lead_form_failed",
          props: { locale, reason: res.status >= 500 ? "server_error" : "invalid_phone" },
        });
        phoneRef.current?.focus();
      }
    } catch {
      setState("error");
      trackEvent({ event: "lead_form_failed", props: { locale, reason: "network_error" } });
    }
  }

  const input =
    "mt-1.5 w-full rounded-md border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted transition-[border-color] duration-150 focus:border-brand";
  const hasNameError = state === "name_error";
  const hasPhoneError = state === "error";
  const statusText =
    state === "ok"
      ? okText
      : state === "limited"
        ? rateLimitedText
        : state === "name_error"
          ? labels.nameRequired
          : state === "error"
            ? errText
            : labels.privacy;
  const statusClass =
    state === "ok"
      ? "text-stamp font-medium"
      : state === "error" || state === "name_error" || state === "limited"
        ? "text-danger font-medium"
        : "text-muted";

  return (
    <form onSubmit={onSubmit} onFocus={markStarted} className="grid gap-4" noValidate>
      <div>
        <label htmlFor={nameId} className="block text-sm font-medium text-ink">
          {labels.name}
        </label>
        <input
          ref={nameRef}
          id={nameId}
          name="name"
          required
          autoComplete="name"
          placeholder={labels.namePlaceholder}
          aria-invalid={hasNameError}
          aria-describedby={hasNameError ? statusId : undefined}
          onChange={() => {
            if (hasNameError) setState("idle");
          }}
          className={`${input}${hasNameError ? " border-danger" : ""}`}
        />
      </div>
      <div>
        <label htmlFor={phoneId} className="block text-sm font-medium text-ink">
          {labels.phone}
        </label>
        <input
          ref={phoneRef}
          id={phoneId}
          name="phone"
          required
          type="tel"
          inputMode="tel"
          spellCheck={false}
          autoComplete="tel"
          placeholder={labels.phonePlaceholder}
          aria-invalid={hasPhoneError}
          aria-describedby={hasPhoneError ? statusId : undefined}
          onChange={() => {
            if (hasPhoneError) setState("idle");
          }}
          className={`${input}${hasPhoneError ? " border-danger" : ""}`}
        />
      </div>
      <button
        type="submit"
        disabled={state === "sending"}
        className="pm-btn pm-btn-primary pm-btn-block"
      >
        {state === "sending" ? labels.sending : labels.submit}
      </button>
      <p id={statusId} role="status" aria-live="polite" className={`min-h-5 text-sm ${statusClass}`}>
        {statusText}
      </p>
    </form>
  );
}
