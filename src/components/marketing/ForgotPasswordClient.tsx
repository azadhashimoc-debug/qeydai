"use client";

import Link from "next/link";
import { useId, useState } from "react";

type Props = {
  lang: "az" | "en";
  loginHref: string;
  contactHref: string;
};

const COPY = {
  az: {
    title: "Şifrəni sıfırla",
    subtitle: "Qeydiyyatdan keçdiyiniz e-poçt ünvanını daxil edin. Hesab mövcuddursa, şifrə yeniləmə linki göndərəcəyik.",
    emailLabel: "E-poçt ünvanı",
    emailPlaceholder: "ad@sirket.az",
    submit: "Sıfırlama linki göndər",
    sending: "Göndərilir...",
    sent: "Əgər bu e-poçt ünvanı ilə hesab mövcuddursa, şifrə sıfırlama linki göndərildi. Zəhmət olmasa gələnlər və spam qovluğunu yoxlayın.",
    notConfigured: "E-poçt xidməti bu mühitdə hələ qoşulmayıb. Şifrə bərpası üçün dəstək komandamızla əlaqə saxlayın.",
    invalidEmail: "Düzgün e-poçt ünvanı daxil edin.",
    rateLimited: "Çox sorğu göndərildi. Bir neçə dəqiqə sonra yenidən cəhd edin.",
    error: "Sorğunu göndərmək mümkün olmadı. Yenidən cəhd edin.",
    backToLogin: "Giriş səhifəsinə qayıt",
    contactSupport: "Dəstək ilə əlaqə",
  },
  en: {
    title: "Reset your password",
    subtitle: "Enter the email address linked to your account. If an account exists, we will send a password reset link.",
    emailLabel: "Email address",
    emailPlaceholder: "name@company.com",
    submit: "Send reset link",
    sending: "Sending...",
    sent: "If an account exists for that email address, we have sent a password reset link. Please check your inbox and spam folder.",
    notConfigured: "Email delivery is not enabled in this environment yet. Please contact our support team to recover access.",
    invalidEmail: "Please enter a valid email address.",
    rateLimited: "Too many requests. Please try again in a few minutes.",
    error: "Unable to process your request right now. Please try again.",
    backToLogin: "Back to sign in",
    contactSupport: "Contact support",
  },
} as const;

export function ForgotPasswordClient({ lang, loginHref, contactHref }: Props) {
  const t = COPY[lang];
  const emailId = useId();
  const statusId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "not_configured" | "invalid" | "limited" | "error"
  >("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("invalid");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/panel/account/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: trimmed, locale: lang }),
      });
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as { emailConfigured?: boolean } | null;
        setStatus(body?.emailConfigured === false ? "not_configured" : "sent");
        return;
      }
      if (res.status === 429) {
        setStatus("limited");
        return;
      }
      if (res.status === 422) {
        setStatus("invalid");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const isError = status === "invalid" || status === "limited" || status === "error";
  const statusMessage =
    status === "sent"
      ? t.sent
      : status === "not_configured"
        ? t.notConfigured
        : status === "invalid"
          ? t.invalidEmail
          : status === "limited"
            ? t.rateLimited
            : status === "error"
              ? t.error
              : "";

  return (
    <div className="pm-auth-form-box">
      <h1 className="pm-auth-heading">{t.title}</h1>
      <p className="pm-auth-subheading">{t.subtitle}</p>

      <form onSubmit={onSubmit} className="pm-auth-form" noValidate>
        <div className="pm-auth-field">
          <label htmlFor={emailId} className="pm-sr-only">
            {t.emailLabel}
          </label>
          <div className="pm-auth-input-shell">
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (isError) setStatus("idle");
              }}
              placeholder={t.emailPlaceholder}
              aria-invalid={isError}
              aria-describedby={statusMessage ? statusId : undefined}
              className="pm-auth-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="pm-auth-submit-pill"
        >
          {status === "sending" ? t.sending : t.submit}
        </button>

        {statusMessage && (
          <p
            id={statusId}
            role="status"
            aria-live="polite"
            className={
              status === "sent"
                ? "pm-auth-status is-ok"
                : isError
                  ? "pm-auth-status is-error"
                  : "pm-auth-status"
            }
          >
            {statusMessage}
          </p>
        )}
      </form>

      <div className="pm-auth-footer-links" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href={loginHref} className="pm-auth-forgot-link">
          {t.backToLogin}
        </Link>
        {status === "not_configured" && (
          <Link href={contactHref} className="pm-auth-forgot-link">
            {t.contactSupport}
          </Link>
        )}
      </div>
    </div>
  );
}
