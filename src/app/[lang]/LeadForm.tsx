"use client";
import { useState } from "react";

type Labels = { name: string; phone: string; submit: string; privacy: string };

export function LeadForm({ labels, okText, errText, rateLimitedText }: { labels: Labels; okText: string; errText: string; rateLimitedText: string }) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error" | "limited">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), phone: fd.get("phone") }),
      });
      setState(res.ok ? "ok" : res.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-muted focus:border-brand";
  return (
    <form onSubmit={onSubmit} className="grid gap-3" noValidate>
      <input name="name" required autoComplete="name" placeholder={labels.name} aria-label={labels.name} className={input} />
      <input name="phone" required type="tel" autoComplete="tel" placeholder={labels.phone} aria-label={labels.phone} className={input} />
      <button
        disabled={state === "sending"}
        className="rounded-xl bg-brand px-5 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {labels.submit}
      </button>
      <p role="status" className="min-h-5 text-sm text-muted">
        {state === "ok" ? okText : state === "limited" ? rateLimitedText : state === "error" ? errText : labels.privacy}
      </p>
    </form>
  );
}
