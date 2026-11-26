"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  lang: "az" | "en";
  token: string;
  panelHref: string;
  loginHref: string;
};

const COPY = {
  az: {
    title: "E-poçt təsdiqi",
    verifying: "E-poçt ünvanınız təsdiqlənir...",
    verified: "E-poçt ünvanınız uğurla təsdiqləndi! Artıq iş sahənizə daxil ola bilərsiniz.",
    invalid: "Təsdiq linki etibarsızdır və ya müddəti bitib. Aşağıdan yeni təsdiq məktubu tələb edə bilərsiniz.",
    openPanel: "CRM panelini aç",
    goToLogin: "Giriş səhifəsinə keç",
    resendLabel: "E-poçt ünvanınız",
    resendPlaceholder: "ad@sirket.az",
    resendBtn: "Yeni təsdiq linki göndər",
    resending: "Göndərilir...",
    resent: "Əgər bu e-poçt təsdiqlənməmiş hesabla bağlıdırsa, yeni təsdiq linki göndərildi.",
    limited: "Çox sorğu göndərildi. Bir az sonra yenidən cəhd edin.",
    error: "Sorğunu icra etmək mümkün olmadı. Yenidən cəhd edin.",
  },
  en: {
    title: "Email verification",
    verifying: "Verifying your email address...",
    verified: "Your email address has been verified! You can now open your workspace.",
    invalid: "This verification link is invalid or has expired. You can request a fresh link below.",
    openPanel: "Open CRM panel",
    goToLogin: "Go to sign in",
    resendLabel: "Your email address",
    resendPlaceholder: "name@company.com",
    resendBtn: "Resend verification link",
    resending: "Sending...",
    resent: "If this email belongs to an unverified account, a new verification link has been sent.",
    limited: "Too many requests. Please try again later.",
    error: "Unable to complete request. Please try again.",
  },
} as const;

export function VerifyEmailClient({ lang, token, panelHref, loginHref }: Props) {
  const t = COPY[lang];
  const emailId = useId();
  const attemptedRef = useRef(false);
  const [verifyState, setVerifyState] = useState<"verifying" | "verified" | "invalid" | "error">(
    token ? "verifying" : "invalid",
  );
  const [email, setEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "limited" | "error">("idle");

  useEffect(() => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;
    let active = true;
    void fetch("/api/panel/account/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!active) return;
        if (res.ok) setVerifyState("verified");
        else if (res.status === 400) setVerifyState("invalid");
        else setVerifyState("error");
      })
      .catch(() => {
        if (active) setVerifyState("error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function onResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setResendState("sending");
    try {
      const res = await fetch("/api/panel/account/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: trimmed, locale: lang }),
      });
      if (res.ok) setResendState("sent");
      else if (res.status === 429) setResendState("limited");
      else setResendState("error");
    } catch {
      setResendState("error");
    }
  }

  return (
    <div className="pm-auth-form-box">
      <h1 className="pm-auth-heading">{t.title}</h1>

      <p
        role="status"
        aria-live="polite"
        className={
          verifyState === "verified"
            ? "pm-auth-status is-ok"
            : verifyState === "verifying"
              ? "pm-auth-status"
              : "pm-auth-status is-error"
        }
      >
        {verifyState === "verifying"
          ? t.verifying
          : verifyState === "verified"
            ? t.verified
            : verifyState === "invalid"
              ? t.invalid
              : t.error}
      </p>

      {verifyState === "verified" ? (
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href={panelHref} className="pm-auth-submit-pill" style={{ textAlign: "center", textDecoration: "none" }}>
            {t.openPanel}
          </Link>
        </div>
      ) : null}

      {(verifyState === "invalid" || verifyState === "error") && (
        <form onSubmit={onResend} className="pm-auth-form" style={{ marginTop: "1rem" }} noValidate>
          <div className="pm-auth-field">
            <label htmlFor={emailId} className="pm-sr-only">
              {t.resendLabel}
            </label>
            <div className="pm-auth-input-shell">
              <input
                id={emailId}
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.resendPlaceholder}
                className="pm-auth-input"
              />
            </div>
          </div>
          <button type="submit" disabled={resendState === "sending" || resendState === "sent"} className="pm-auth-submit-pill">
            {resendState === "sending" ? t.resending : t.resendBtn}
          </button>
          {resendState === "sent" && <p className="pm-auth-status is-ok">{t.resent}</p>}
          {resendState === "limited" && <p className="pm-auth-status is-error">{t.limited}</p>}
          {resendState === "error" && <p className="pm-auth-status is-error">{t.error}</p>}
        </form>
      )}

      <div className="pm-auth-footer-links" style={{ marginTop: "1rem" }}>
        <Link href={loginHref} className="pm-auth-forgot-link">
          {t.goToLogin}
        </Link>
      </div>
    </div>
  );
}
