"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export type AuthEmailConfirmCopy = {
  title: string;
  body: string;
  button: string;
  confirming: string;
  failed: string;
  back: string;
};

/** Landing page of the e-mail link. The token is only spent when the person presses the button. */
export function AuthEmailConfirm({ lang, copy }: { lang: "az" | "en"; copy: AuthEmailConfirmCopy }) {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  async function confirm() {
    if (state === "working" || !token) return;
    setState("working");
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.push(`/${lang}/panel`);
        return;
      }
      setState("failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="pm-auth-form-box">
      <h1 className="pm-auth-heading">{copy.title}</h1>
      <p className="pm-auth-note">{copy.body}</p>
      <button type="button" className="pm-auth-submit-pill" onClick={confirm} disabled={state === "working" || !token}>
        {state === "working" ? copy.confirming : copy.button}
      </button>
      <p role="status" aria-live="polite" className={state === "failed" || !token ? "pm-auth-status is-error" : "pm-auth-status"}>
        {state === "failed" || !token ? copy.failed : ""}
      </p>
      <div className="pm-auth-footer-links">
        <Link href={`/${lang}/login`} className="pm-auth-forgot-link">{copy.back}</Link>
      </div>
    </div>
  );
}
