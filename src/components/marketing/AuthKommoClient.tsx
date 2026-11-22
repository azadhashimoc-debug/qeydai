"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AuthSocialRow, type SocialProviders } from "./AuthSocialRow";

export type AuthKommoCopy = {
  title: string;
  keyLabel: string;
  keyPlaceholder: string;
  showKey: string;
  hideKey: string;
  submit: string;
  submitting: string;
  passkeyLabel: string;
  googleLabel: string;
  facebookLabel: string;
  oauthDenied: string;
  oauthError: string;
  oauthEmail: string;
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
  providers: SocialProviders;
  /** Optional block shown above the social buttons (e-mail link sign-in). */
  extra?: React.ReactNode;
};

export function AuthKommoClient({ lang, copy, contactHref, providers, extra }: Props) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [typedStatus, setStatus] = useState<"idle" | "submitting" | "invalid" | "limited" | "network">("idle");
  // The OAuth callback redirects back here with ?oauth=denied|error|email; shown until the user starts typing.
  const oauthParam = useSearchParams().get("oauth");
  const [oauthDismissed, setOauthDismissed] = useState(false);
  const oauthStatus =
    oauthDismissed ? "idle"
    : oauthParam === "denied" ? "oauth_denied"
    : oauthParam === "email" ? "oauth_email"
    : oauthParam === "error" ? "oauth_error"
    : "idle";
  const status = typedStatus !== "idle" ? typedStatus : oauthStatus;
  const keyId = useId();
  const statusId = useId();
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      setKey("");
      setShowKey(false);
    };
  }, []);

  const isError = status !== "idle" && status !== "submitting";
  const statusText =
    status === "invalid" ? copy.invalidKey
    : status === "limited" ? copy.rateLimited
    : status === "network" ? copy.networkError
    : status === "oauth_denied" ? copy.oauthDenied
    : status === "oauth_error" ? copy.oauthError
    : status === "oauth_email" ? copy.oauthEmail
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
      const res = await fetch("/api/panel/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ key: trimmedKey }),
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
          <form onSubmit={handleSubmit} className="pm-auth-form" noValidate>
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
                    if (isError) {
                      setStatus("idle");
                      setOauthDismissed(true);
                    }
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


      {extra}
      <AuthSocialRow
        lang={lang}
        providers={providers}
        googleLabel={copy.googleLabel}
        facebookLabel={copy.facebookLabel}
      />
      <div className="pm-auth-footer-links">
        <Link href={contactHref} className="pm-auth-forgot-link">
          {copy.forgotLink}
        </Link>
      </div>
    </div>
  );
}
