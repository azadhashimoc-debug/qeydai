"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type AuthKommoCopy = {
  badge: string;
  title: string;
  subtitle: string;
  keyLabel: string;
  keyPlaceholder: string;
  showKey: string;
  hideKey: string;
  submit: string;
  submitting: string;
  invalidKey: string;
  rateLimited: string;
  networkError: string;
  securityNote: string;
  noAccountText: string;
  registerLink: string;
};

type Props = {
  lang: "az" | "en";
  copy: AuthKommoCopy;
  registerHref: string;
};

export function AuthKommoClient({ lang, copy, registerHref }: Props) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "invalid" | "limited" | "network"
  >("idle");
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
  const errorText =
    status === "invalid"
      ? copy.invalidKey
      : status === "limited"
        ? copy.rateLimited
        : status === "network"
          ? copy.networkError
          : "";

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
        router.push(`/${lang}/panel`);
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
    <div className="pm-auth-kommo">
      <div className="pm-auth-kommo-card">
        <span className="pm-auth-kommo-badge">{copy.badge}</span>
        <h1 className="pm-auth-kommo-title">{copy.title}</h1>
        <p className="pm-auth-kommo-sub">{copy.subtitle}</p>

        <form onSubmit={handleSubmit} className="pm-form" noValidate>
          <div className="pm-auth-kommo-field">
            <label htmlFor={keyId} className="pm-field">
              {copy.keyLabel}
            </label>
            <div className="pm-auth-kommo-input-wrap">
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
                  if (isError) setStatus("idle");
                }}
                placeholder={copy.keyPlaceholder}
                className="pm-auth-kommo-input"
                aria-invalid={isError}
                aria-describedby={errorText ? statusId : undefined}
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-pressed={showKey}
                className="pm-auth-kommo-toggle"
              >
                {showKey ? copy.hideKey : copy.showKey}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="pm-auth-kommo-btn"
          >
            {status === "submitting" ? copy.submitting : copy.submit}
          </button>

          <p id={statusId} role="status" aria-live="polite" className={isError ? "pm-error-note" : "pm-auth-note"}>
            {errorText || copy.securityNote}
          </p>
        </form>

        <div className="pm-auth-kommo-switch">
          <span>{copy.noAccountText}</span>
          <Link href={registerHref}>{copy.registerLink}</Link>
        </div>
      </div>
    </div>
  );
}
