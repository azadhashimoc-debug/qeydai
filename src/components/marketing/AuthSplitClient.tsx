"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export type LoginPageCopy = {
  userLabel: string;
  userPlaceholder: string;
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

type AuthSplitClientProps = {
  lang: "az" | "en";
  copy: LoginPageCopy;
  registerHref: string;
};

export function AuthSplitClient({ lang, copy, registerHref }: AuthSplitClientProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "invalid" | "limited" | "network">(
    "idle"
  );
  const userId = useId();
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
    <>
      <form onSubmit={handleSubmit} className="pm-form" noValidate>
        <div className="pm-field">
          <label htmlFor={userId}>{copy.userLabel}</label>
          <input
            id={userId}
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (isError) setStatus("idle");
            }}
            placeholder={copy.userPlaceholder}
          />
        </div>

        <div className="pm-field">
          <label htmlFor={keyId}>{copy.keyLabel}</label>
          <div className="pm-key-wrap">
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
              aria-invalid={isError}
              aria-describedby={errorText ? statusId : undefined}
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              aria-pressed={showKey}
              className="pm-key-toggle"
            >
              {showKey ? copy.hideKey : copy.showKey}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="pm-btn pm-btn-primary"
          style={{ width: "100%" }}
        >
          {status === "submitting" ? copy.submitting : copy.submit}
        </button>

        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={isError ? "pm-error-note" : "pm-auth-note"}
        >
          {errorText || copy.securityNote}
        </p>
      </form>

      <div className="pm-auth-switch">
        <span>{copy.noAccountText}</span>
        <Link href={registerHref}>{copy.registerLink}</Link>
      </div>
    </>
  );
}
