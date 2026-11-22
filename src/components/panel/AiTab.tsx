"use client";

import { useEffect, useState } from "react";
import type { PanelDict } from "./types";

type AiStatus = {
  active: boolean;
  providers: { name: string; model: string }[];
  hasKnowledge: boolean;
};

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; status: AiStatus };

export function AiTab({ d }: { lang: "az" | "en"; d: PanelDict }) {
  const ai = d.ai;
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/panel/ai", { credentials: "same-origin", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("status");
        const data = (await res.json()) as AiStatus;
        setState({ kind: "ready", status: data });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ kind: "error" });
      });
    return () => controller.abort();
  }, []);

  const rules = [ai.rule1, ai.rule2, ai.rule3, ai.rule4, ai.rule5];

  return (
    <div className="space-y-6">
      <header className="panel-card crm-section-heading">
        <h1 className="text-2xl font-semibold sm:text-3xl">{ai.title}</h1>
        <p className="text-muted">{ai.subtitle}</p>
      </header>

      <section className="panel-card crm-form-card space-y-3 p-4" aria-live="polite">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-ink">{ai.statusTitle}</h2>
          {state.kind === "loading" && <span className="text-sm text-muted">{ai.statusLoading}</span>}
          {state.kind === "error" && <span className="text-sm text-muted">{ai.statusError}</span>}
          {state.kind === "ready" && (
            <span
              className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${
                state.status.active ? "border-stamp/40 bg-stamp/10 text-stamp" : "border-line bg-bg text-ink"
              }`}
            >
              {state.status.active ? ai.statusActive : ai.statusInactive}
            </span>
          )}
        </div>

        {state.kind === "ready" && (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-semibold text-ink">{ai.providersLabel}</dt>
              <dd className="text-muted">
                {state.status.providers.length === 0
                  ? ai.providersNone
                  : state.status.providers.map((p) => `${p.name} (${p.model})`).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{ai.knowledgeLabel}</dt>
              <dd className="text-muted">{state.status.hasKnowledge ? ai.knowledgeOk : ai.knowledgeMissing}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="panel-card p-4">
        <h2 className="mb-2 font-semibold text-ink">{ai.rulesTitle}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
