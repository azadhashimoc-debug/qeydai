"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { buttonClass } from "@/components/ui/button";
import type { PanelDict, PanelLocale } from "./types";

type LoginGateProps = {
  lang: PanelLocale;
  brand: string;
  d: PanelDict;
  notice?: string | null;
  onAuthenticated: (tenantId: string) => void;
};

export function LoginGate({ lang, brand, d, notice, onAuthenticated }: LoginGateProps) {
  const [username, setUsername] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "invalid" | "limited" | "network">("idle");
  const usernameId = useId();
  const inputId = useId();
  const statusId = useId();
  const usernameRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      setKey("");
      setShowKey(false);
    };
  }, []);

  const otherLang: PanelLocale = lang === "az" ? "en" : "az";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = key.trim();
    const trimmedUser = username.trim();
    if (!trimmedUser || !trimmed) {
      setStatus("invalid");
      if (!trimmedUser) usernameRef.current?.focus();
      else inputRef.current?.focus();
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/panel/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ key: trimmed }),
      });

      if (res.ok) {
        const data = (await res.json()) as { ok: true; tenantId: string };
        setKey("");
        setStatus("idle");
        onAuthenticated(data.tenantId);
        return;
      }

      if (res.status === 429) {
        setStatus("limited");
        return;
      }

      setStatus("invalid");
      inputRef.current?.focus();
    } catch {
      setStatus("network");
    }
  }

  const errorText =
    status === "invalid"
      ? d.login.invalidKey
      : status === "limited"
        ? d.login.rateLimited
        : status === "network"
          ? d.login.networkError
          : notice ?? "";

  const isError = status === "invalid" || status === "limited" || status === "network";

  return (
    <div className="crm-screen flex min-h-screen flex-col">
      <header className="border-b border-line bg-bg/90 backdrop-blur">
        <nav aria-label={d.navAria} className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href={`/${lang}`} className="flex min-h-11 items-center gap-2.5 text-lg font-bold">
            <LogoMark />
            <span translate="no">{brand}</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href={`/${otherLang}/panel`}
              hrefLang={otherLang}
              aria-label={`${d.switchLang}: ${otherLang.toUpperCase()}`}
              className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold uppercase text-muted transition-[color,border-color] hover:border-ink hover:text-ink"
            >
              {otherLang}
            </Link>
            <Link
              href={`/${lang}`}
              className={buttonClass({ variant: "secondary", size: "sm", className: "inline-flex min-h-11 items-center" })}
            >
              {d.backToSite}
            </Link>
          </div>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="panel-register crm-login-card w-full max-w-md p-6 sm:p-9">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <p className="text-sm font-semibold text-muted">{d.login.eyebrow}</p>
            <span className="rounded border border-brand/25 bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-pen">
              {d.badge}
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">
            {d.login.title}
          </h1>
          <p className="mt-2 text-[0.95rem] text-muted">{d.login.subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
            <div>
              <label htmlFor={usernameId} className="block text-sm font-semibold text-ink">
                {d.login.userLabel ?? "İstifadəçi adı"}
              </label>
              <div className="mt-1.5">
                <input
                  ref={usernameRef}
                  id={usernameId}
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (isError) setStatus("idle");
                  }}
                  placeholder={d.login.userPlaceholder ?? "istifadeci@example.com"}
                  aria-invalid={isError}
                  aria-describedby={errorText ? statusId : undefined}
                  className={`min-h-11 min-w-0 flex-1 rounded-md border bg-bg px-3.5 py-2.5 text-ink placeholder:text-muted transition-[border-color] duration-150 focus:border-brand ${
                    isError ? "border-danger" : "border-line"
                  }`}
                />
              </div>
            </div>
            <div>
              <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
                {d.login.keyLabel}
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  ref={inputRef}
                  id={inputId}
                  name="key"
                  type={showKey ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    if (isError) setStatus("idle");
                  }}
                  placeholder={d.login.keyPlaceholder}
                  aria-invalid={isError}
                  aria-describedby={errorText ? statusId : undefined}
                  className={`min-h-11 min-w-0 flex-1 rounded-md border bg-bg px-3.5 py-2.5 text-ink placeholder:text-muted transition-[border-color] duration-150 focus:border-brand ${
                    isError ? "border-danger" : "border-line"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-pressed={showKey}
                  className="min-h-11 shrink-0 rounded-md border border-line bg-bg px-3 text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  {showKey ? d.login.hideKey : d.login.showKey}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className={buttonClass({ size: "lg", className: "min-h-11 w-full" })}
            >
              {status === "submitting" ? d.login.submitting : d.login.submit}
            </button>


            <p
              id={statusId}
              role="status"
              aria-live="polite"
              className={`min-h-5 text-sm ${isError ? "font-medium text-danger" : "text-muted"}`}
            >
              {errorText || d.login.securityNote}
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
