"use client";

import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { Locale } from "@/lib/analytics/events";
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

const WORKSPACE_COPY = {
  az: {
    step3Title: "14 günlük sınaq müddətinə başlayın",
    step3Sub: "Bütün özəlliklərə və 10GB yaddaş sahəsinə giriş əldə edin. Kredit kartı tələb olunmur",
    accountNameLabel: "Biznesin adı",
    accountNamePlaceholder: "Məsələn: Bakı Tədris Mərkəzi",
    subdomainLabel: "Hesabın alt domeni",
    industryLabel: "Sektor",
    industries: [
      "Təhsil və Kurslar",
      "İdman və fitnes",
      "Sağlamlıq və Gözəllik",
      "Pərakəndə satış və elektron ticarət",
      "Daşınmaz Əmlak",
      "Rəqəmsal və İT Xidmətləri",
    ],
    businessTypeLabel: "Biznes növü",
    businessTypes: ["B2C (Fərdi müştərilər)", "B2B (Korporativ)", "Hər ikisi (B2B & B2C)"],
    employeesLabel: "İşçi sayı",
    employeeCounts: ["1 - 5", "6 - 15", "16 - 50", "50+"],
    clientsLabel: "Aylıq müştəri / müraciət sayı",
    clientCounts: ["1 - 100", "100 - 500", "500 - 2000", "2000+"],
    openPanelBtn: "Hesab yarat və CRM panelini aç",
  },
  en: {
    step3Title: "Start your 14-day free trial",
    step3Sub: "Access all features and 10GB storage. No credit card required",
    accountNameLabel: "Account name (Center or company name)",
    accountNamePlaceholder: "e.g. Baku Learning Center",
    subdomainLabel: "Account subdomain",
    industryLabel: "Industry",
    industries: [
      "Education & Training",
      "Sports & Fitness",
      "Health & Beauty",
      "Retail & E-commerce",
      "Real Estate",
      "Digital & IT Services",
    ],
    businessTypeLabel: "Business type",
    businessTypes: ["B2C (Consumers)", "B2B (Business)", "Both (B2B & B2C)"],
    employeesLabel: "Number of employees",
    employeeCounts: ["1 - 5", "6 - 15", "16 - 50", "50+"],
    clientsLabel: "Monthly clients / leads",
    clientCounts: ["1 - 100", "100 - 500", "500 - 2000", "2000+"],
    openPanelBtn: "Create account & Open Live CRM Panel",
  },
} as const;

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
  const [workspaceName, setWorkspaceName] = useState("Bakı Mərkəzi");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountStatus, setAccountStatus] = useState<"idle" | "saving" | "exists" | "error">("idle");
  const emailId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const phoneId = useId();
  const statusId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const ws = WORKSPACE_COPY[locale];

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
      ? ""
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

    // This is the business onboarding step, not a marketing lead submission.
    // Create the account only when the password is entered in the final step.
    setWorkspaceName(rawName);
    setState("ok");
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

      {/* Step 3: Kommo Create Account / Subdomain screen (.js-create-account) */}
      {state === "ok" && (
        <div className="pm-kommo-create-account js-create-account">
          <h2 className="pm-kommo-create-title js-create-account-title">{ws.step3Title}</h2>
          <p className="pm-auth-note js-create-account-subtitle">{ws.step3Sub}</p>
          <label className="pm-kommo-field js-control-account-wrapper">
            <span>{ws.accountNameLabel}</span>
            <input
              type="text"
              name="account"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </label>
          <label className="pm-kommo-field">
            <span>{locale === "az" ? "Şifrə (ən azı 12 simvol)" : "Password (minimum 12 characters)"}</span>
            <input type="password" autoComplete="new-password" required minLength={12} maxLength={128}
              value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} />
          </label>
          <button type="button" className="pm-auth-submit-pill pm-kommo-open-panel-link js-create-account-submit-button"
            disabled={accountStatus === "saving" || accountPassword.length < 12 || workspaceName.trim().length < 2}
            onClick={async () => {
              if (!emailRef.current?.reportValidity()) return;
              setAccountStatus("saving");
              try {
                const response = await fetch("/api/panel/account/register", {
                  method: "POST",
                  credentials: "same-origin",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    businessName: workspaceName.trim(), email: emailRef.current.value.trim(), password: accountPassword,
                  }),
                });
                if (response.ok) {
                  window.location.assign(`/${locale}/panel`);
                  return;
                }
                setAccountStatus(response.status === 409 ? "exists" : "error");
              } catch {
                setAccountStatus("error");
              }
            }}
          >
            {accountStatus === "saving"
              ? (locale === "az" ? "Hesab yaradılır..." : "Creating account...")
              : ws.openPanelBtn}
          </button>
          {accountStatus === "exists" && <p role="alert" className="pm-auth-status is-error">
            {locale === "az" ? "Bu e-poçtla hesab artıq mövcuddur." : "An account with this email already exists."}
          </p>}
          {accountStatus === "error" && <p role="alert" className="pm-auth-status is-error">
            {locale === "az" ? "Hesab yaratmaq mümkün olmadı. Yenidən yoxlayın." : "Unable to create account. Please retry."}
          </p>}
        </div>
      )}

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
