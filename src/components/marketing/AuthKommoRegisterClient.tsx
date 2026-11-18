"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { extractUtmProps } from "@/lib/analytics/events";
import { getActiveExperimentToken } from "@/lib/experiments/ab";
import type { Locale } from "@/lib/analytics/events";

export type AuthKommoRegisterCopy = {
  badge: string;
  title: string;
  subtitle: string;
  formTitle: string;
  name: string;
  namePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  submit: string;
  sending: string;
  nameRequired: string;
  privacy: string;
  okText: string;
  errText: string;
  rateLimitedText: string;
  hasAccount: string;
  loginLink: string;
};

type Props = {
  locale: Locale;
  copy: AuthKommoRegisterCopy;
  loginHref: string;
};

export function AuthKommoRegisterClient({ locale, copy, loginHref }: Props) {
  const [state, setState] = useState<
    "idle" | "sending" | "ok" | "error" | "name_error" | "limited"
  >("idle");
  const nameId = useId();
  const phoneId = useId();
  const statusId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const markStarted = useCallback(() => {
    trackEvent({
      event: "lead_form_started",
      props: { locale, exp: getActiveExperimentToken() },
    });
  }, [locale]);

  const hasNameError = state === "name_error";
  const hasPhoneError = state === "error";
  const statusText =
    state === "ok"
      ? copy.okText
      : state === "limited"
        ? copy.rateLimitedText
        : state === "name_error"
          ? copy.nameRequired
          : state === "error"
            ? copy.errText
            : copy.privacy;
  const statusClass =
    state === "ok"
      ? "text-stamp font-medium"
      : state === "error" || state === "name_error" || state === "limited"
        ? "text-danger font-medium"
        : "text-muted";

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
        const { utm_source, utm_medium, utm_campaign } = extractUtmProps(
          typeof window !== "undefined" ? window.location.search : "",
        );
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
      } else {
        setState("error");
        phoneRef.current?.focus();
      }
    } catch {
      setState("error");
    }
  }

  const input = "pm-auth-kommo-input";

  return (
    <div className="pm-auth-kommo">
      <div className="pm-auth-kommo-card">
        <span className="pm-auth-kommo-badge">{copy.badge}</span>
        <h1 className="pm-auth-kommo-title">{copy.title}</h1>
        <p className="pm-auth-kommo-sub">{copy.subtitle}</p>
        <h2 className="pm-auth-kommo-title" style={{ fontSize: "1.15rem" }}>
          {copy.formTitle}
        </h2>

        <form onSubmit={onSubmit} className="pm-form" noValidate>
          <div className="pm-auth-kommo-field">
            <label htmlFor={nameId} className="pm-field">
              {copy.name}
            </label>
            <input
              ref={nameRef}
              id={nameId}
              name="name"
              required
              autoComplete="name"
              placeholder={copy.namePlaceholder}
              aria-invalid={hasNameError}
              aria-describedby={hasNameError ? statusId : undefined}
              onChange={() => {
                if (hasNameError) setState("idle");
              }}
              className={input}
            />
          </div>
          <div className="pm-auth-kommo-field">
            <label htmlFor={phoneId} className="pm-field">
              {copy.phone}
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
              placeholder={copy.phonePlaceholder}
              aria-invalid={hasPhoneError}
              aria-describedby={hasPhoneError ? statusId : undefined}
              onChange={() => {
                if (hasPhoneError) setState("idle");
              }}
              className={input}
            />
          </div>

          <button
            type="submit"
            disabled={state === "sending"}
            className="pm-auth-kommo-btn"
          >
            {state === "sending" ? copy.sending : copy.submit}
          </button>

          <p id={statusId} role="status" aria-live="polite" className={`pm-auth-note ${statusClass}`}>
            {statusText}
          </p>
        </form>

        <div className="pm-auth-kommo-switch">
          <span>{copy.hasAccount}</span>
          <Link href={loginHref}>{copy.loginLink}</Link>
        </div>
      </div>
    </div>
  );
}
