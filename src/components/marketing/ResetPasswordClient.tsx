"use client";

import Link from "next/link";
import { useId, useState } from "react";

type Props = {
  lang: "az" | "en";
  token: string;
  loginHref: string;
  forgotHref: string;
};

const COPY = {
  az: {
    title: "Yeni şifrə təyin et",
    subtitle: "Hesabınız üçün ən azı 12 simvoldan ibarət güclü yeni şifrə seçin.",
    passwordLabel: "Yeni şifrə",
    passwordPlaceholder: "Yeni şifrə (ən azı 12 simvol)",
    confirmLabel: "Şifrəni təsdiqlə",
    confirmPlaceholder: "Yeni şifrəni təkrar daxil edin",
    submit: "Şifrəni yenilə",
    saving: "Yenilənir...",
    success: "Şifrəniz uğurla yeniləndi. İndi yeni şifrə ilə daxil ola bilərsiniz.",
    weak: "Şifrə ən azı 12 simvol olmalıdır.",
    mismatch: "Şifrələr uyğun gəlmir.",
    invalidToken: "Bu sıfırlama linki etibarsızdır və ya müddəti bitib. Yeni link tələb edin.",
    limited: "Çox cəhd edildi. Bir az sonra yenidən cəhd edin.",
    error: "Şifrəni yeniləmək mümkün olmadı. Yenidən cəhd edin.",
    goToLogin: "Daxil ol",
    requestNew: "Yeni link tələb et",
  },
  en: {
    title: "Choose a new password",
    subtitle: "Create a strong new password of at least 12 characters for your account.",
    passwordLabel: "New password",
    passwordPlaceholder: "New password (at least 12 characters)",
    confirmLabel: "Confirm password",
    confirmPlaceholder: "Re-enter new password",
    submit: "Update password",
    saving: "Updating...",
    success: "Your password has been updated. You can now sign in with your new password.",
    weak: "Password must be at least 12 characters long.",
    mismatch: "Passwords do not match.",
    invalidToken: "This reset link is invalid or has expired. Please request a new link.",
    limited: "Too many attempts. Please try again later.",
    error: "Unable to update password right now. Please try again.",
    goToLogin: "Sign in",
    requestNew: "Request a new link",
  },
} as const;

export function ResetPasswordClient({ lang, token, loginHref, forgotHref }: Props) {
  const t = COPY[lang];
  const pwId = useId();
  const confirmId = useId();
  const statusId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<
    "idle" | "saving" | "done" | "weak" | "mismatch" | "invalid_token" | "limited" | "error"
  >(token ? "idle" : "invalid_token");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setStatus("invalid_token");
      return;
    }
    if (password.length < 12) {
      setStatus("weak");
      return;
    }
    if (password !== confirm) {
      setStatus("mismatch");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/panel/account/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setPassword("");
        setConfirm("");
        setStatus("done");
        return;
      }
      if (res.status === 400) {
        setStatus("invalid_token");
        return;
      }
      if (res.status === 422) {
        setStatus("weak");
        return;
      }
      if (res.status === 429) {
        setStatus("limited");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const statusMessage =
    status === "done"
      ? t.success
      : status === "weak"
        ? t.weak
        : status === "mismatch"
          ? t.mismatch
          : status === "invalid_token"
            ? t.invalidToken
            : status === "limited"
              ? t.limited
              : status === "error"
                ? t.error
                : "";

  return (
    <div className="pm-auth-form-box">
      <h1 className="pm-auth-heading">{t.title}</h1>
      <p className="pm-auth-subheading">{t.subtitle}</p>

      {status !== "done" && token ? (
        <form onSubmit={onSubmit} className="pm-auth-form" noValidate>
          <div className="pm-auth-field">
            <label htmlFor={pwId} className="pm-sr-only">
              {t.passwordLabel}
            </label>
            <div className="pm-auth-input-shell">
              <input
                id={pwId}
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (status === "weak" || status === "mismatch") setStatus("idle");
                }}
                placeholder={t.passwordPlaceholder}
                className="pm-auth-input"
              />
            </div>
          </div>

          <div className="pm-auth-field">
            <label htmlFor={confirmId} className="pm-sr-only">
              {t.confirmLabel}
            </label>
            <div className="pm-auth-input-shell">
              <input
                id={confirmId}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (status === "mismatch") setStatus("idle");
                }}
                placeholder={t.confirmPlaceholder}
                className="pm-auth-input"
              />
            </div>
          </div>

          <button type="submit" disabled={status === "saving"} className="pm-auth-submit-pill">
            {status === "saving" ? t.saving : t.submit}
          </button>
        </form>
      ) : null}

      {statusMessage && (
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={status === "done" ? "pm-auth-status is-ok" : "pm-auth-status is-error"}
          style={{ marginTop: "1rem" }}
        >
          {statusMessage}
        </p>
      )}

      <div className="pm-auth-footer-links" style={{ marginTop: "1rem" }}>
        {status === "done" ? (
          <Link href={loginHref} className="pm-auth-submit-pill" style={{ display: "inline-block", textDecoration: "none" }}>
            {t.goToLogin}
          </Link>
        ) : (
          <Link href={forgotHref} className="pm-auth-forgot-link">
            {t.requestNew}
          </Link>
        )}
      </div>
    </div>
  );
}
