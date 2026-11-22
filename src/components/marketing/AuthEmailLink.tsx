"use client";

import { useId, useState } from "react";

export type AuthEmailLinkCopy = {
  emailLabel: string;
  emailPlaceholder: string;
  hint: string;
  submit: string;
  sending: string;
  sent: string;
  invalid: string;
  rateLimited: string;
  error: string;
};

type State = "idle" | "sending" | "sent" | "invalid" | "limited" | "error";

/** Passwordless e-mail sign-in: asks the server to mail a one-time link. Rendered only when e-mail is configured. */
export function AuthEmailLink({ lang, copy }: { lang: "az" | "en"; copy: AuthEmailLinkCopy }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const inputId = useId();
  const statusId = useId();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, lang }),
      });
      if (res.ok) setState("sent");
      else if (res.status === 422) setState("invalid");
      else if (res.status === 429) setState("limited");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  const text =
    state === "sent" ? copy.sent
    : state === "invalid" ? copy.invalid
    : state === "limited" ? copy.rateLimited
    : state === "error" ? copy.error
    : "";

  return (
    <form onSubmit={onSubmit} className="pm-auth-form" noValidate style={{ marginTop: 20 }}>
      <p className="pm-auth-note">{copy.hint}</p>
      <div className="pm-auth-field">
        <label htmlFor={inputId} className="pm-sr-only">{copy.emailLabel}</label>
        <div className="pm-auth-input-shell">
          <input
            id={inputId}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== "sending") setState("idle");
            }}
            placeholder={copy.emailPlaceholder}
            className="pm-auth-input"
            aria-invalid={state === "invalid"}
            aria-describedby={text ? statusId : undefined}
          />
        </div>
      </div>
      <button type="submit" className="pm-auth-submit-pill" disabled={state === "sending" || email.trim().length < 5}>
        {state === "sending" ? copy.sending : copy.submit}
      </button>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={state === "sent" ? "pm-auth-status is-ok" : text ? "pm-auth-status is-error" : "pm-auth-status"}
      >
        {text}
      </p>
    </form>
  );
}
