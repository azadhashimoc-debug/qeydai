"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

const WORKSPACE_COPY = {
  az: {
    step3Title: "14 günlük sınağınızı başladın",
    step3Sub: "Bütün imkanlara və 10GB yaddaş sahəsinə giriş əldə edin. Kredit kartı tələb olunmur",
    accountNameLabel: "Hesab adı (Biznes və ya şirkət adı)",
    accountNamePlaceholder: "Məsələn: Bakı Xidmət MMC",
    subdomainLabel: "Hesab alt alan adı",
    industryLabel: "Sektor",
    industries: [
      "Təhsil və Kurslar",
      "İdman və Fitnes",
      "Sağlamlıq və Gözəllik",
      "Pərakəndə və E-ticarət",
      "Daşınmaz Əmlak",
      "Rəqəmsal və İT Xidmətləri",
    ],
    businessTypeLabel: "Biznes növü",
    businessTypes: ["B2C (Fərdi müştərilər)", "B2B (Korporativ)", "Hər ikisi (B2B & B2C)"],
    employeesLabel: "Əməkdaş sayı",
    employeeCounts: ["1 - 5", "6 - 15", "16 - 50", "50+"],
    clientsLabel: "Aylıq müştəri / müraciət sayı",
    clientCounts: ["1 - 100", "100 - 500", "500 - 2000", "2000+"],
    openPanelBtn: "Hesab yarat və Canlı CRM Panelini Aç",
  },
  en: {
    step3Title: "Start your 14-day free trial",
    step3Sub: "Access all features and 10GB storage. No credit card required",
    accountNameLabel: "Account name (Business or company name)",
    accountNamePlaceholder: "e.g. Baku Studio LLC",
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

const PASSWORD_COPY = {
  az: {
    label: "Parol",
    placeholder: "Parol (ən azı 12 simvol)",
    weak: "Parol ən azı 12 simvol olmalıdır.",
    verifyTitle: "E-poçtunuzu yoxlayın",
    verifyBody: "Davam etmək üçün göndərdiyimiz təsdiq linkinə klikləyin. Məktubu görmürsünüzsə, spam qovluğunu yoxlayın və ya yenidən göndərin.",
    resendBtn: "Təsdiq linkini yenidən göndər",
    resending: "Göndərilir...",
    resent: "Yeni təsdiq linki göndərildi.",
    unavailable: "Qeydiyyat hazırda əlçatan deyil. Bir az sonra yenidən cəhd edin.",
  },
  en: {
    label: "Password",
    placeholder: "Password (at least 12 characters)",
    weak: "Password must be at least 12 characters long.",
    verifyTitle: "Check your email",
    verifyBody: "Click the verification link we sent to your inbox to activate your workspace. Check spam or resend if needed.",
    resendBtn: "Resend verification link",
    resending: "Sending...",
    resent: "A fresh verification link has been sent.",
    unavailable: "Sign-up is unavailable right now. Please try again shortly.",
  },
} as const;

export function AuthKommoRegisterClient({
  locale,
  copy,
  loginHref,
  termsHref,
  privacyHref,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<
    "idle" | "sending" | "ok" | "verify_email" | "error" | "name_error" | "limited" | "social" | "weak_password" | "unavailable"
  >("idle");
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Mənim Biznesim");
  const [subdomain, setSubdomain] = useState("menim-biznesim");
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const emailId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const phoneId = useId();
  const statusId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const ws = WORKSPACE_COPY[locale];
  const pw = PASSWORD_COPY[locale];
  const passwordId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);

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
      : state === "verify_email"
        ? pw.verifyBody
        : state === "limited"
          ? copy.rateLimitedText
          : state === "name_error"
            ? copy.nameRequired
            : state === "error"
              ? copy.errText
              : state === "social"
                ? copy.socialNote
                : state === "weak_password"
                  ? pw.weak
                  : state === "unavailable"
                    ? pw.unavailable
                    : "";

  async function handleResend() {
    if (!registeredEmail || resendState === "sending") return;
    setResendState("sending");
    try {
      const res = await fetch("/api/panel/account/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: registeredEmail, locale }),
      });
      setResendState(res.ok ? "sent" : "error");
    } catch {
      setResendState("error");
    }
  }

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
    const rawPassword = String(fd.get("password") ?? "");
    const rawEmail = (emailRef.current?.value ?? "").trim();

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

    if (rawPassword.length < 12) {
      setState("weak_password");
      passwordRef.current?.focus();
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/panel/account/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: rawEmail,
          password: rawPassword,
          businessName: rawName,
          locale,
        }),
      });
      if (res.status === 202) {
        setRegisteredEmail(rawEmail);
        setResendState("idle");
        setState("verify_email");
        return;
      }
      if (res.ok) {
        // Keep the phone number as a CRM lead too; failure here must not block sign-up.
        void fetch("/api/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: rawName, phone: rawPhone }),
        }).catch(() => undefined);
        setState("ok");
        const slug = rawName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (slug) {
          setWorkspaceName(rawName);
          setSubdomain(slug);
        }
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
      } else if (res.status === 422) {
        const body = (await res.json().catch(() => null)) as { field?: string } | null;
        if (body?.field === "name") {
          setState("name_error");
          nameRef.current?.focus();
        } else if (body?.field === "email") {
          setState("error");
          emailRef.current?.focus();
        } else {
          setState("weak_password");
          passwordRef.current?.focus();
        }
      } else if (res.status === 503) {
        setState("unavailable");
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
                    if (hasNameError) setState("idle");
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
                    if (hasPhoneError) setState("idle");
                  }}
                  className="pm-auth-input"
                />
              </div>
            </div>

            <div className="pm-auth-field">
              <label htmlFor={passwordId} className="pm-sr-only">
                {pw.label}
              </label>
              <div className="pm-auth-input-shell">
                <span className="pm-auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  ref={passwordRef}
                  id={passwordId}
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder={pw.placeholder}
                  aria-invalid={state === "weak_password"}
                  aria-describedby={state === "weak_password" ? statusId : undefined}
                  onChange={() => {
                    if (state === "weak_password") setState("idle");
                  }}
                  className="pm-auth-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={state === "sending" || state === "verify_email"}
              className="pm-auth-submit-pill"
            >
              {state === "sending" ? copy.sending : copy.submit}
            </button>

            {statusText && state !== "verify_email" && (
              <p
                id={statusId}
                role="status"
                aria-live="polite"
                className={
                  state === "ok"
                    ? "pm-auth-status is-ok"
                    : "pm-auth-status is-error"
                }
              >
                {statusText}
              </p>
            )}
          </>
        )}
      </form>

      {state === "verify_email" && (
        <div className="pm-kommo-create-account" role="status" aria-live="polite">
          <h2 className="pm-kommo-create-title">{pw.verifyTitle}</h2>
          <p className="pm-auth-note">{pw.verifyBody}</p>
          <button
            type="button"
            disabled={resendState === "sending" || resendState === "sent"}
            onClick={handleResend}
            className="pm-auth-submit-pill"
          >
            {resendState === "sending"
              ? pw.resending
              : resendState === "sent"
                ? pw.resent
                : pw.resendBtn}
          </button>
        </div>
      )}

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
          <label className="pm-kommo-field js-control-subdomain-wrapper">
            <span>{ws.subdomainLabel}</span>
            <div className="pm-kommo-subdomain-box">
              <input
                type="text"
                name="subdomain"
                value={subdomain}
                onChange={(e) =>
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
              />
              <span>.panelim.az</span>
            </div>
          </label>
          <div className="pm-tools-row">
            <label className="pm-kommo-field js-industry-select">
              <span>{ws.industryLabel}</span>
              <select defaultValue={ws.industries[0]}>
                {ws.industries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="pm-kommo-field js-business-type-select">
              <span>{ws.businessTypeLabel}</span>
              <select defaultValue={ws.businessTypes[0]}>
                {ws.businessTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="pm-tools-row">
            <label className="pm-kommo-field js-employees-count-select">
              <span>{ws.employeesLabel}</span>
              <select defaultValue={ws.employeeCounts[0]}>
                {ws.employeeCounts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="pm-kommo-field js-clients-count-select">
              <span>{ws.clientsLabel}</span>
              <select defaultValue={ws.clientCounts[0]}>
                {ws.clientCounts.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={savingWorkspace}
            onClick={async () => {
              const trimmed = workspaceName.trim();
              if (trimmed) {
                setSavingWorkspace(true);
                await fetch("/api/panel/workspace", {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  credentials: "same-origin",
                  body: JSON.stringify({ name: trimmed, locale }),
                }).catch(() => undefined);
                setSavingWorkspace(false);
              }
              router.push(`/${locale}/panel`);
            }}
            className="pm-auth-submit-pill pm-kommo-open-panel-link js-create-account-submit-button"
          >
            {ws.openPanelBtn} →
          </button>
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
        googleHref={`/api/panel/oauth/google/start?lang=${locale}`}
        facebookHref={`/api/panel/oauth/facebook/start?lang=${locale}`}
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
