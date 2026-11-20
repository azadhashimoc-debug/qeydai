"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { extractUtmProps, type Locale } from "@/lib/analytics/events";
import { getActiveExperimentToken } from "@/lib/experiments/ab";
import { AuthSocialRow } from "./AuthSocialRow";

export type AuthKommoRegisterCopy = {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
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
  googleLabel: string;
  facebookLabel: string;
  socialNote: string;
  termsPrefix: string;
  termsLinkText: string;
  termsAnd: string;
  privacyLinkText: string;
  hasAccount: string;
  loginLink: string;
};

type Props = {
  locale: Locale;
  copy: AuthKommoRegisterCopy;
  loginHref: string;
  termsHref: string;
  privacyHref: string;
};

export function AuthKommoRegisterClient({
  locale,
  copy,
  loginHref,
  termsHref,
  privacyHref,
}: Props) {
  const [state, setState] = useState<
    "idle" | "sending" | "ok" | "error" | "name_error" | "limited" | "social"
  >("idle");
  const [detailsVisible, setDetailsVisible] = useState(false);
  const emailId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
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
            : state === "social"
              ? copy.socialNote
              : "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending" || !emailRef.current?.reportValidity()) return;
    if (!detailsVisible) {
      setDetailsVisible(true);
      return;
    }
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

  return (
    <div className="pm-auth-form-box">
      <h1 className="pm-auth-heading">{copy.title}</h1>
      <p className="pm-auth-subheading">{copy.subtitle}</p>

      <form onSubmit={onSubmit} className="pm-auth-form" noValidate>
        <div className="pm-auth-field">
          <label htmlFor={emailId} className="pm-sr-only">{copy.emailLabel}</label>
          <div className="pm-auth-input-shell">
            <input
              id={emailId}
              ref={emailRef}
              type="email"
              autoComplete="email"
              required
              readOnly={state === "sending"}
              placeholder={copy.emailPlaceholder}
              className="pm-auth-input"
            />
          </div>
        </div>
        {!detailsVisible && (
          <button type="submit" className="pm-auth-submit-pill">{copy.submit}</button>
        )}
        {detailsVisible && (
          <>
            <div className="pm-auth-field">
              <label htmlFor={nameId} className="pm-sr-only">
                {copy.name}
              </label>
              <div className="pm-auth-input-shell">
                <span className="pm-auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
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
                    if (hasNameError || state === "social") setState("idle");
                  }}
                  className="pm-auth-input"
                />
              </div>
            </div>

            <div className="pm-auth-field">
              <label htmlFor={phoneId} className="pm-sr-only">
                {copy.phone}
              </label>
              <div className="pm-auth-input-shell">
                <span className="pm-auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
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
                    if (hasPhoneError || state === "social") setState("idle");
                  }}
                  className="pm-auth-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={state === "sending"}
              className="pm-auth-submit-pill"
            >
              {state === "sending" ? copy.sending : copy.submit}
            </button>

            {statusText && (
              <p
                id={statusId}
                role="status"
                aria-live="polite"
                className={
                  state === "ok"
                    ? "pm-auth-status is-ok"
                    : state === "social"
                      ? "pm-auth-status"
                      : "pm-auth-status is-error"
                }
              >
                {statusText}
              </p>
            )}
          </>
        )}
      </form>

      <p className="pm-auth-legal-note">
        {copy.termsPrefix}{" "}
        <Link href={termsHref}>{copy.termsLinkText}</Link>{" "}
        {copy.termsAnd}{" "}
        <Link href={privacyHref}>{copy.privacyLinkText}</Link>
      </p>

      <AuthSocialRow
        googleLabel={copy.googleLabel}
        facebookLabel={copy.facebookLabel}
        onSocialClick={() => setState("social")}
      />

      <div className="pm-auth-footer-links">
        <span>{copy.hasAccount}</span>{" "}
        <Link href={loginHref} className="pm-auth-forgot-link">
          {copy.loginLink}
        </Link>
      </div>
    </div>
  );
}
