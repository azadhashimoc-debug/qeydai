"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AuthSocialRow } from "./AuthSocialRow";

export type AuthKommoCopy = {
  title: string;
  emailLabel: string;
  emailPlaceholder: string;
  keyLabel: string;
  keyPlaceholder: string;
  showKey: string;
  hideKey: string;
  submit: string;
  submitting: string;
  passkeyLabel: string;
  googleLabel: string;
  facebookLabel: string;
  socialNote: string;
  forgotLink: string;
  invalidKey: string;
  rateLimited: string;
  networkError: string;
  securityNote: string;
};

type Props = {
  lang: "az" | "en";
  copy: AuthKommoCopy;
  contactHref: string;
};

const EXTRA_COPY = {
  az: {
    passkeyUnavailable:
      "Parol açarları (Passkey) bu cihazda mövcud deyil. Zəhmət olmasa başqa giriş üsulu sınayın.",
    mfaToggle: "2FA kodu ilə doğrulama",
    forgotModalBtn: "Şifrəni sıfırla",
    forgotTitle: "Şifrənizi unutmusunuz?",
    forgotSub:
      "Narahat olmayın! E-poçt ünvanınızı daxil edin və dəstək komandamızla əlaqə yaradın.",
    forgotSubmit: "Şifrəni sıfırla",
    forgotUnavailable:
      "Avtomatik e-poçt şifrə sıfırlaması hələ aktiv deyil. Şifrəni yeniləmək üçün iş sahəsi administratoru və ya dəstək komandamızla əlaqə saxlayın.",
    backToLogin: "Girişə qayıt",
    mfaTitle: "İki addımlı doğrulama",
    mfaSub: "Doğrulama tətbiqinizdəki 6 rəqəmli təhlükəsizlik kodunu daxil edin.",
    mfaVerifyBtn: "Kodu doğrula",
    mfaResend: "Kodu yenidən göndər (0:45)",
    mfaUseBackup: "Ehtiyat kod istifadə et",
    mfaBackupTitle: "Ehtiyat kod ilə giriş",
    mfaBackupPlaceholder: "XXXX-XXXX-XXXX",
    mfaNeedHelp: "Kömək lazımdır?",
    mfaHelpText:
      "Doğrulama cihazınıza girişiniz yoxdursa, iş sahəsi administratoru və ya dəstək komandamızla əlaqə saxlayın.",
    mfaUnavailable:
      "Bu iş sahəsi üçün iki addımlı doğrulama aktiv deyil. Zəhmət olmasa e-poçt/şifrə və ya giriş açarı ilə daxil olun.",
    invalidCredentials: "E-poçt və ya şifrə yanlışdır.",
  },
  en: {
    passkeyUnavailable:
      "Passkeys are not available on this device. Please try another sign-in method.",
    mfaToggle: "Verify with 2FA code",
    forgotModalBtn: "Reset password",
    forgotTitle: "Forgot your password?",
    forgotSub:
      "No worries! Enter your email address and reach out to our support team for a reset.",
    forgotSubmit: "Reset password",
    forgotUnavailable:
      "Automated email password reset is not enabled yet. Please contact your workspace admin or our support team.",
    backToLogin: "Back to sign in",
    mfaTitle: "Two-factor authentication",
    mfaSub: "Enter the 6-digit security code from your authenticator app.",
    mfaVerifyBtn: "Verify code",
    mfaResend: "Resend code (0:45)",
    mfaUseBackup: "Use a backup code",
    mfaBackupTitle: "Sign in with backup code",
    mfaBackupPlaceholder: "XXXX-XXXX-XXXX",
    mfaNeedHelp: "Need help?",
    mfaHelpText:
      "If you lost access to your authenticator device, contact your workspace admin or support team.",
    mfaUnavailable:
      "Two-factor authentication is not enabled for this workspace. Please sign in with your email/password or access key.",
    invalidCredentials: "Invalid email or password.",
  },
} as const;

export function AuthKommoClient({ lang, copy, contactHref }: Props) {
  const router = useRouter();
  const extra = EXTRA_COPY[lang];
  const [view, setView] = useState<
    | "login"
    | "forgot-email"
    | "mfa-otp"
    | "mfa-backup"
    | "mfa-help"
  >("login");
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState(false);
  const [forgotNotice, setForgotNotice] = useState(false);
  const [mfaNotice, setMfaNotice] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [backupCode, setBackupCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "invalid" | "invalid_credentials" | "limited" | "network" | "social"
  >("idle");
  const emailId = useId();
  const keyId = useId();
  const statusId = useId();
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      setKey("");
      setShowKey(false);
    };
  }, []);

  const isError =
    status === "invalid" || status === "invalid_credentials" || status === "limited" || status === "network";
  const statusText =
    status === "invalid"
      ? copy.invalidKey
      : status === "invalid_credentials"
        ? extra.invalidCredentials
        : status === "limited"
          ? copy.rateLimited
          : status === "network"
            ? copy.networkError
            : status === "social"
              ? copy.socialNote
              : copy.securityNote;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setStatus(trimmedEmail ? "invalid_credentials" : "invalid");
      keyRef.current?.focus();
      return;
    }

    setStatus("submitting");
    try {
      // With an email: email + password account login. Without: legacy admin access key.
      const res = trimmedEmail
        ? await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ email: trimmedEmail, password: key }),
          })
        : await fetch("/api/panel/auth", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ key: trimmedKey }),
          });

      if (res.ok) {
        setKey("");
        setStatus("idle");
        router.push(`/${lang}/panel`);
        return;
      }

      if (res.status === 429) {
        setStatus("limited");
        return;
      }

      setStatus(trimmedEmail ? "invalid_credentials" : "invalid");
      keyRef.current?.focus();
    } catch {
      setStatus("network");
    }
  }

  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
  }

  return (
    <div className="pm-auth-form-box">
      {view === "login" && (
        <>
          <h1 className="pm-auth-heading">{copy.title}</h1>

          {passkeyNotice && (
            <div
              role="alert"
              className="pm-kommo-passkey-notice js-passkey-not-available-notification"
            >
              <span>🔑 {extra.passkeyUnavailable}</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPasskeyNotice(false)}
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="pm-auth-form" noValidate>
            <div className="pm-auth-field">
              <label htmlFor={emailId} className="pm-sr-only">
                {copy.emailLabel}
              </label>
              <div className="pm-auth-input-shell">
                <span className="pm-auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  className="pm-auth-input"
                />
              </div>
            </div>

            <div className="pm-auth-field">
              <label htmlFor={keyId} className="pm-sr-only">
                {copy.keyLabel}
              </label>
              <div className="pm-auth-input-shell">
                <span className="pm-auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  ref={keyRef}
                  id={keyId}
                  name="key"
                  type={showKey ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    if (isError || status === "social") setStatus("idle");
                  }}
                  placeholder={copy.keyPlaceholder}
                  className="pm-auth-input has-toggle"
                  aria-invalid={isError}
                  aria-describedby={statusText ? statusId : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  aria-pressed={showKey}
                  className="pm-auth-show-btn"
                >
                  {showKey ? copy.hideKey : copy.showKey}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="pm-auth-submit-pill"
            >
              {status === "submitting" ? copy.submitting : copy.submit}
            </button>

            <p
              id={statusId}
              role="status"
              aria-live="polite"
              className={isError ? "pm-auth-status is-error" : "pm-auth-status"}
            >
              {statusText}
            </p>
          </form>

          <div className="pm-kommo-auth-quick-row">
            <button
              type="button"
              className="pm-kommo-passkey-btn js-passkey-sign-in-form"
              onClick={() => setPasskeyNotice(true)}
            >
              🔑 {copy.passkeyLabel}
            </button>
            <button
              type="button"
              className="pm-kommo-passkey-btn js-mfa-trigger"
              onClick={() => setView("mfa-otp")}
            >
              🛡️ {extra.mfaToggle}
            </button>
          </div>

          <AuthSocialRow
            googleLabel={copy.googleLabel}
            facebookLabel={copy.facebookLabel}
            onSocialClick={() => setStatus("social")}
          />

          <div className="pm-auth-footer-links">
            <button
              type="button"
              className="pm-kommo-inline-link js-forgot-button"
              onClick={() => setView("forgot-email")}
            >
              {extra.forgotModalBtn}
            </button>
            <span>·</span>
            <Link href={contactHref} className="pm-auth-forgot-link">
              {copy.forgotLink}
            </Link>
          </div>
        </>
      )}

      {view === "forgot-email" && (
        <div className="pm-kommo-subview js-forgot">
          <h1 className="pm-auth-heading">{extra.forgotTitle}</h1>
          <p className="pm-auth-subheading">{extra.forgotSub}</p>
          <form
            className="pm-auth-form js-forgot-form"
            onSubmit={(e) => {
              e.preventDefault();
              setForgotNotice(true);
            }}
          >
            <div className="pm-auth-field">
              <div className="pm-auth-input-shell">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setForgotNotice(false);
                    setEmail(e.target.value);
                  }}
                  placeholder={copy.emailPlaceholder}
                  className="pm-auth-input"
                />
              </div>
            </div>
            {forgotNotice && (
              <p role="status" aria-live="polite" className="pm-auth-status is-error">
                {extra.forgotUnavailable}
              </p>
            )}
            <button type="submit" className="pm-auth-submit-pill">
              {extra.forgotSubmit}
            </button>
          </form>
          <div className="pm-auth-footer-links">
            <button
              type="button"
              className="pm-kommo-inline-link js-back-to-login"
              onClick={() => {
                setForgotNotice(false);
                setView("login");
              }}
            >
              ← {extra.backToLogin}
            </button>
            <span>·</span>
            <Link href={contactHref} className="pm-auth-forgot-link">
              {copy.forgotLink}
            </Link>
          </div>
        </div>
      )}

      {view === "mfa-otp" && (
        <div className="pm-kommo-subview js-mfa-auth">
          <div className="pm-kommo-flow-art">
            <Image
              src={
                lang === "en"
                  ? "/images/flow-auth-passkey-2fa-en.webp"
                  : "/images/flow-auth-passkey-2fa.webp"
              }
              alt="2FA & Passkey Security"
              width={320}
              height={178}
              className="pm-kommo-flow-img"
            />
          </div>
          <h1 className="pm-auth-heading">{extra.mfaTitle}</h1>
          <p className="pm-auth-subheading">{extra.mfaSub}</p>
          <form
            className="pm-auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              setMfaNotice(true);
            }}
          >
            <div className="pm-kommo-otp-row">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`mfa-${idx + 1}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  aria-label={`OTP ${idx + 1}`}
                  onChange={(e) => {
                    setMfaNotice(false);
                    handleOtpChange(idx, e.target.value);
                  }}
                  className="pm-kommo-otp-box"
                />
              ))}
            </div>
            {mfaNotice && (
              <p role="status" aria-live="polite" className="pm-auth-status is-error">
                {extra.mfaUnavailable}
              </p>
            )}
            <button type="submit" className="pm-auth-submit-pill">
              {extra.mfaVerifyBtn}
            </button>
          </form>
          <div className="pm-kommo-mfa-links">
            <span className="pm-kommo-mfa-timer">{extra.mfaResend}</span>
            <button
              type="button"
              className="pm-kommo-inline-link"
              onClick={() => setView("mfa-backup")}
            >
              {extra.mfaUseBackup}
            </button>
            <button
              type="button"
              className="pm-kommo-inline-link"
              onClick={() => setView("mfa-help")}
            >
              {extra.mfaNeedHelp}
            </button>
            <button
              type="button"
              className="pm-kommo-inline-link"
              onClick={() => setView("login")}
            >
              ← {extra.backToLogin}
            </button>
          </div>
        </div>
      )}

      {view === "mfa-backup" && (
        <div className="pm-kommo-subview js-mfa-backup">
          <h1 className="pm-auth-heading">{extra.mfaBackupTitle}</h1>
          <form
            className="pm-auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              setMfaNotice(true);
            }}
          >
            <div className="pm-auth-field">
              <div className="pm-auth-input-shell">
                <input
                  type="text"
                  required
                  value={backupCode}
                  onChange={(e) => {
                    setMfaNotice(false);
                    setBackupCode(e.target.value);
                  }}
                  placeholder={extra.mfaBackupPlaceholder}
                  className="pm-auth-input"
                />
              </div>
            </div>
            {mfaNotice && (
              <p role="status" aria-live="polite" className="pm-auth-status is-error">
                {extra.mfaUnavailable}
              </p>
            )}
            <button type="submit" className="pm-auth-submit-pill">
              {extra.mfaVerifyBtn}
            </button>
          </form>
          <div className="pm-auth-footer-links">
            <button
              type="button"
              className="pm-kommo-inline-link"
              onClick={() => setView("mfa-otp")}
            >
              ← {extra.mfaTitle}
            </button>
          </div>
        </div>
      )}

      {view === "mfa-help" && (
        <div className="pm-kommo-subview js-mfa-support">
          <h1 className="pm-auth-heading">{extra.mfaNeedHelp}</h1>
          <p className="pm-auth-subheading">{extra.mfaHelpText}</p>
          <div className="pm-auth-footer-links">
            <button
              type="button"
              className="pm-kommo-inline-link"
              onClick={() => setView("mfa-otp")}
            >
              ← {extra.mfaTitle}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
