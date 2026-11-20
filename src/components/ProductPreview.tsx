"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ChannelIcons";
import { LogoMark } from "@/components/Logo";

export type PreviewCopy = {
  tabs: { inbox: string; pipeline: string; bookings: string; analytics: string };
  menu: { overview: string; inbox: string; pipeline: string; bookings: string; analytics: string };
  stages: { new: string; talking: string; booked: string };
  people: { one: string; two: string; three: string };
  topics: { one: string; two: string; three: string };
  incoming: string;
  outgoing: string;
  confirmed: string;
  times: { one: string; two: string; three: string };
  seats: { one: string; two: string; three: string };
  channelFilter: string;
  sampleBadge: string;
  unreadBadge: string;
  assigneeLabel: string;
  metrics: { one: string; two: string; three: string };
  metricValues: { one: string; two: string; three: string };
};

function TabIcon({ kind }: { kind: "overview" | "inbox" | "pipeline" | "bookings" | "analytics" }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (kind === "overview") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="6" height="6" rx="1.5" />
        <rect x="11" y="3" width="6" height="6" rx="1.5" />
        <rect x="3" y="11" width="6" height="6" rx="1.5" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" />
      </svg>
    );
  }
  if (kind === "inbox") {
    return (
      <svg {...common}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3V5.5Z" />
      </svg>
    );
  }
  if (kind === "pipeline") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="4" height="12" rx="1" />
        <rect x="8.5" y="4" width="4" height="8" rx="1" />
        <rect x="14" y="4" width="3" height="10" rx="1" />
      </svg>
    );
  }
  if (kind === "bookings") {
    return (
      <svg {...common}>
        <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
        <path d="M6.5 2.5v3M13.5 2.5v3M3 8.5h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 15.5V11M9.5 15.5V7M15 15.5V4.5" />
    </svg>
  );
}

function ChannelBadge({ index, size = 18 }: { index: number; size?: number }) {
  if (index === 0) return <WhatsAppIcon size={size} />;
  if (index === 1) return <InstagramIcon size={size} />;
  return <TelegramIcon size={size} />;
}

export function ProductPreview({
  copy,
  brand,
  lobbyAlt,
}: {
  copy: PreviewCopy;
  brand: string;
  lobbyAlt: string;
}) {
  const [active, setActive] = useState(0);
  const tabDefs = [
    { key: "inbox" as const, label: copy.tabs.inbox },
    { key: "pipeline" as const, label: copy.tabs.pipeline },
    { key: "bookings" as const, label: copy.tabs.bookings },
    { key: "analytics" as const, label: copy.tabs.analytics },
  ];
  const menuItems = [
    { key: "overview" as const, label: copy.menu.overview },
    { key: "inbox" as const, label: copy.menu.inbox },
    { key: "pipeline" as const, label: copy.menu.pipeline },
    { key: "bookings" as const, label: copy.menu.bookings },
    { key: "analytics" as const, label: copy.menu.analytics },
  ];
  const people = [copy.people.one, copy.people.two, copy.people.three];
  const topics = [copy.topics.one, copy.topics.two, copy.topics.three];
  const stages = [copy.stages.new, copy.stages.talking, copy.stages.booked];
  const times = [copy.times.one, copy.times.two, copy.times.three];
  const seats = [copy.seats.one, copy.seats.two, copy.seats.three];
  const metrics = [
    { label: copy.metrics.one, value: copy.metricValues.one, pct: 76 },
    { label: copy.metrics.two, value: copy.metricValues.two, pct: 58 },
    { label: copy.metrics.three, value: copy.metricValues.three, pct: 86 },
  ];
  const channels = ["WhatsApp", "Instagram", "Telegram"];

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
      let nextIdx: number | null = null;
      if (e.key === "ArrowRight") nextIdx = Math.min(currentIdx + 1, tabDefs.length - 1);
      else if (e.key === "ArrowLeft") nextIdx = Math.max(currentIdx - 1, 0);
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = tabDefs.length - 1;
      if (nextIdx !== null) {
        e.preventDefault();
        setActive(nextIdx);
        tabRefs.current[nextIdx]?.focus();
      }
    },
    [tabDefs.length]
  );

  return (
    <div className="pm-preview">
      <div className="pm-preview-tabs" role="tablist" aria-label={copy.sampleBadge}>
        {tabDefs.map((tab, index) => {
          const isSelected = active === index;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`pm-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`pm-tabpanel-${tab.key}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={isSelected ? "pm-preview-tab is-active" : "pm-preview-tab"}
            >
              <TabIcon kind={tab.key} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pm-preview-frame">
        <div className="pm-preview-app">
          <aside aria-hidden="true" className="pm-preview-sidebar">
            <div className="pm-preview-brand">
              <LogoMark size={22} />
              <span translate="no">{brand}</span>
            </div>
            {menuItems.map((item, index) => (
              <div
                key={item.key}
                className={index === active + 1 ? "pm-preview-nav-item is-active" : "pm-preview-nav-item"}
              >
                <TabIcon kind={item.key} />
                <span>{item.label}</span>
              </div>
            ))}
            <div className="pm-preview-desk-thumb">
              <Image
                src="/images/w-lobby.webp"
                alt={lobbyAlt}
                width={176}
                height={96}
                className="pm-preview-desk-img"
              />
              <span>{copy.assigneeLabel}</span>
            </div>
          </aside>

          <div className="pm-preview-main" aria-live="polite">
            <div className="pm-preview-topbar">
              <strong>{tabDefs[active].label}</strong>
              <div className="pm-preview-badges">
                <span className="pm-pill-muted">{copy.assigneeLabel}</span>
                <span className="pm-pill-mint">{copy.sampleBadge}</span>
              </div>
            </div>

            <div
              role="tabpanel"
              id={`pm-tabpanel-${tabDefs[0].key}`}
              aria-labelledby={`pm-tab-${tabDefs[0].key}`}
              tabIndex={0}
              hidden={active !== 0}
            >
              {active === 0 && (
                <div className="pm-preview-inbox">
                <div className="pm-preview-threads">
                  <div className="pm-preview-filter">
                    <span>{copy.channelFilter}</span>
                    <span className="pm-unread-dot">{copy.unreadBadge}</span>
                  </div>
                  {people.map((name, index) => (
                    <div key={name} className={index === 0 ? "pm-thread is-active" : "pm-thread"}>
                      <span className="pm-avatar-wrap">
                        <span className="pm-avatar">{name.charAt(0)}</span>
                        <span className="pm-avatar-ch">
                          <ChannelBadge index={index} size={14} />
                        </span>
                      </span>
                      <div className="pm-thread-meta">
                        <strong>{name}</strong>
                        <small>{channels[index]}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pm-preview-chat">
                  <div className="pm-chat-head">
                    <WhatsAppIcon size={28} />
                    <div>
                      <strong>{people[0]}</strong>
                      <small>WhatsApp · {copy.confirmed}</small>
                    </div>
                    <span className="pm-pill-mint pm-chat-topic">{topics[0]}</span>
                  </div>
                  <div className="pm-bubbles">
                    <p className="pm-bubble-in">{copy.incoming}</p>
                    <p className="pm-bubble-out">{copy.outgoing}</p>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div role="tabpanel" id={`pm-tabpanel-${tabDefs[1].key}`} aria-labelledby={`pm-tab-${tabDefs[1].key}`} tabIndex={0} hidden={active !== 1}>
              {active === 1 && (
                <div className="pm-preview-columns">
                {stages.map((stage, index) => (
                  <div key={stage} className="pm-stage-col">
                    <div className="pm-stage-head">
                      <strong>{stage}</strong>
                      <span>1</span>
                    </div>
                    <div className="pm-deal-card">
                      <div className="pm-deal-top">
                        <ChannelBadge index={index} size={16} />
                        <span className="pm-deal-tag">{channels[index]}</span>
                      </div>
                      <p>{topics[index]}</p>
                      <small>{people[index]}</small>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>

            <div role="tabpanel" id={`pm-tabpanel-${tabDefs[2].key}`} aria-labelledby={`pm-tab-${tabDefs[2].key}`} tabIndex={0} hidden={active !== 2}>
              {active === 2 && (
                <div className="pm-preview-bookings">
                  {topics.map((topic, i) => (
                    <div key={topic} className="pm-booking-card">
                      <div className="pm-booking-top">
                        <strong>{times[i]}</strong>
                        <ChannelBadge index={i} size={16} />
                      </div>
                      <span>{topic}</span>
                      <small>{people[i]}</small>
                      <em className="pm-seat-pill">{seats[i]}</em>
                    </div>
                ))}
                </div>
              )}
            </div>

            <div role="tabpanel" id={`pm-tabpanel-${tabDefs[3].key}`} aria-labelledby={`pm-tab-${tabDefs[3].key}`} tabIndex={0} hidden={active !== 3}>
              {active === 3 && (
                <div className="pm-preview-metrics">
                  {metrics.map((metric, idx) => (
                    <div key={metric.label} className="pm-metric-card">
                      <div className="pm-metric-head">
                        <small>{metric.label}</small>
                        <ChannelBadge index={idx} size={16} />
                      </div>
                      <strong>{metric.value}</strong>
                      <div className="pm-meter">
                        <span style={{ width: `${metric.pct}%` }} />
                      </div>
                    </div>
                ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
