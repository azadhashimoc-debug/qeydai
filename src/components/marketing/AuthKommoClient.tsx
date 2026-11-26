"use client";

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

export function AuthKommoClient({ lang, copy, contactHref }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loginMode, setLoginMode] = useState<"password" | "key">("password");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "invalid" | "limited" | "network" | "social">("idle");
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

  const isError = status === "invalid" || status === "limited" || status === "network";
  const statusText =
    status === "invalid" ? copy.invalidKey
    : status === "limited" ? copy.rateLimited
    : status === "network" ? copy.networkError
    : status === "social" ? copy.socialNote
    : copy.securityNote;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setStatus("invalid");
      keyRef.current?.focus();
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(loginMode === "password" ? "/api/panel/account/login" : "/api/panel/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(loginMode === "password" ? { email, password: key } : { key: trimmedKey }),
      });
      if (res.ok) {
        setKey("");
        setStatus("idle");
        router.replace(`/${lang}/panel`);
        return;
      }
      if (res.status === 429) {
        setStatus("limited");
        return;
      }
      setStatus("invalid");
      keyRef.current?.focus();
    } catch {
      setStatus("network");
    }
  }

  return (
    <div className="pm-auth-form-box">
      <h1 className="pm-auth-heading">{copy.title}</h1>
      <div className="pm-tools-row" role="group" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }} aria-label={lang === "az" ? "Giriş üsulu" : "Sign-in method"}>
        <button type="button" className="pm-auth-submit-pill" style={{ flex: "1 1 140px", minWidth: 0 }} aria-pressed={loginMode === "password"} onClick={() => { setLoginMode("password"); setKey(""); setStatus("idle"); }}>{lang === "az" ? "E-poçt və şifrə" : "Email and password"}</button>
        <button type="button" className="pm-auth-submit-pill" style={{ flex: "1 1 140px", minWidth: 0 }} aria-pressed={loginMode === "key"} onClick={() => { setLoginMode("key"); setKey(""); setStatus("idle"); }}>{lang === "az" ? "Giriş açarı" : "Access key"}</button>
      </div>
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
                {loginMode === "password" ? (lang === "az" ? "Şifrə" : "Password") : copy.keyLabel}
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
                  autoComplete={loginMode === "password" ? "current-password" : "off"}
                  required
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    if (isError || status === "social") setStatus("idle");
                  }}
                  placeholder={loginMode === "password" ? (lang === "az" ? "Şifrənizi daxil edin" : "Enter your password") : copy.keyPlaceholder}
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


      <AuthSocialRow
        googleLabel={copy.googleLabel}
        facebookLabel={copy.facebookLabel}
        onSocialClick={() => setStatus("social")}
      />
      <div className="pm-auth-footer-links">
        <Link href={contactHref} className="pm-auth-forgot-link">
          {copy.forgotLink}
        </Link>
      </div>
    </div>
  );
}
