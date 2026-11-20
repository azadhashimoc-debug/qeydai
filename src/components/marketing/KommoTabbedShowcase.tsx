"use client";

import { useState } from "react";

export type ShowcaseTab = {
  id: string;
  label: string;
  caption: string;
  previewTitle: string;
  previewBadge: string;
  rows: { title: string; meta: string; badge: string; tone: "mint" | "sky" | "amber" }[];
};

export function KommoTabbedShowcase({
  heading,
  subheading,
  tabs,
}: {
  heading: string;
  subheading: string;
  tabs: ShowcaseTab[];
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  if (!active) return null;

  return (
    <section className="pm-section">
      <div className="pm-wrap pm-pipe-focus-grid">
        <div className="pm-pipe-yellow-card">
          <div className="pm-pipe-mini-window">
            <div className="pm-pipe-mini-head">
              <strong>{active.previewTitle}</strong>
              <span className="pm-pipe-mini-badge">{active.previewBadge}</span>
            </div>
            <div className="pm-pipe-mini-rows">
              {active.rows.map((r) => (
                <div key={`${r.title}-${r.meta}`} className="pm-pipe-mini-row">
                  <span>
                    <strong>{r.title}</strong> · {r.meta}
                  </span>
                  <span className={`pm-pipe-stage is-${r.tone}`}>{r.badge}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="pm-pipe-yellow-caption">{active.caption}</p>
        </div>

        <div className="pm-pipe-focus-copy">
          <h2>{heading}</h2>
          <p className="pm-subhero-sub">{subheading}</p>
          <div className="pm-pipe-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeId === t.id}
                onClick={() => setActiveId(t.id)}
                className={activeId === t.id ? "pm-pipe-tab is-active" : "pm-pipe-tab"}
              >
                <span aria-hidden="true">←</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
