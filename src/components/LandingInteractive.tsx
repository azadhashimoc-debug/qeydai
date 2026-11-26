"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/ChannelIcons";
import { LogoMark } from "@/components/Logo";
import {
  convertPriceString,
  type CurrencyCode,
  PricingCurrencyBar,
} from "@/components/marketing/PricingCurrencyBar";

export type AiSpotlightItem = {
  title: string;
  body: string;
  chatUser: string;
  chatBot: string;
  status: string;
};

export function AiSpotlight({
  eyebrow,
  heading,
  subheading,
  cta,
  badge,
  phoneBrand,
  phoneSub,
  notifyAlt,
  items,
}: {
  eyebrow: string;
  heading: string;
  subheading: string;
  cta: string;
  badge: string;
  phoneBrand: string;
  phoneSub: string;
  notifyAlt: string;
  items: AiSpotlightItem[];
}) {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
      let nextIdx: number | null = null;
      if (e.key === "ArrowRight") nextIdx = Math.min(currentIdx + 1, items.length - 1);
      else if (e.key === "ArrowLeft") nextIdx = Math.max(currentIdx - 1, 0);
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = items.length - 1;
      if (nextIdx !== null) {
        e.preventDefault();
        setSelected(nextIdx);
        tabRefs.current[nextIdx]?.focus();
      }
    },
    [items.length]
  );

  const current = items[selected] ?? items[0];

  return (
    <section id="ai" className="pm-section pm-ai-section">
      <div className="pm-wrap">
        <div className="pm-ai-panel">
          <div className="pm-section-head">
            <p className="pm-eyebrow">{eyebrow}</p>
            <h2>{heading}</h2>
            <p>{subheading}</p>
          </div>

          <div className="pm-ai-grid">
            <div className="pm-ai-list" role="tablist" aria-label={eyebrow}>
              {items.map((item, idx) => {
                const active = idx === selected;
                return (
                  <button
                    key={item.title}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    id={`ai-tab-${idx}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`ai-tabpanel-${idx}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setSelected(idx)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={active ? "pm-ai-item is-active" : "pm-ai-item"}
                  >
                    <span className="pm-ai-item-title">{item.title}</span>
                    <span className="pm-ai-item-body">{item.body}</span>
                  </button>
                );
              })}
              <div className="pm-ai-cta-row">
                <a className="pm-btn pm-btn-mint" href="#contact">
                  {cta}
                </a>
              </div>
            </div>

            <div className="pm-ai-stage">
              <div role="tabpanel" id={`ai-tabpanel-${selected}`} aria-labelledby={`ai-tab-${selected}`} tabIndex={0}>
                <div className="pm-ai-photo-chip" aria-hidden="true">
                <Image
                  src="/images/s-notify.webp"
                  alt={notifyAlt}
                  width={120}
                  height={78}
                  className="pm-ai-photo-img"
                />
                <div className="pm-ai-channel-stack">
                  <WhatsAppIcon size={24} />
                  <InstagramIcon size={24} />
                  <TelegramIcon size={24} />
                </div>
              </div>

              <div className="pm-phone-shell" aria-live="polite">
                <div className="pm-phone-top">
                  <div className="pm-phone-avatar">
                    <LogoMark size={20} />
                  </div>
                  <div>
                    <strong>{phoneBrand}</strong>
                    <small>{phoneSub}</small>
                  </div>
                  <span className="pm-phone-badge">{badge}</span>
                </div>
                <div className="pm-phone-body">
                  <div className="pm-phone-msg is-user">{current.chatUser}</div>
                  <div className="pm-phone-msg is-bot">{current.chatBot}</div>
                </div>
                <div className="pm-phone-status">
                  <span className="pm-status-dot" aria-hidden="true" />
                  <span>{current.status}</span>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export type BillingPeriod = "monthly" | "halfYear" | "annual";

export type PricingPlanCard = {
  key: string;
  name: string;
  desc: string;
  prices?: Record<BillingPeriod, string>;
  staticPrice?: string;
  limits: [string, string, string];
  cta: string;
  popular?: boolean;
};

export function PricingShowcase({
  heading,
  subheading,
  periods,
  periodNotes,
  perMonth,
  popularLabel,
  setupPrefix,
  setupValue,
  plans,
  footnote,
  ctaHref = "#contact",
}: {
  heading: string;
  subheading: string;
  periods: Record<BillingPeriod, string>;
  periodNotes: Record<BillingPeriod, string>;
  perMonth: string;
  popularLabel: string;
  setupPrefix: string;
  setupValue: string;
  plans: PricingPlanCard[];
  footnote: string;
  ctaHref?: string;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [currency, setCurrency] = useState<CurrencyCode>("AZN");
  const periodKeys: BillingPeriod[] = ["monthly", "halfYear", "annual"];

  return (
    <section id="pricing" className="pm-section pm-pricing">
      <div className="pm-wrap">
        <div className="pm-section-head">
          <h2>{heading}</h2>
          <p>{subheading}</p>
        </div>

        <div className="pm-period-wrap">
          <div className="pm-period-switch" role="group" aria-label={heading}>
            {periodKeys.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={period === key}
                onClick={() => setPeriod(key)}
                className={period === key ? "is-active" : ""}
              >
                {periods[key]}
              </button>
            ))}
          </div>
          <span className="pm-period-note">{periodNotes[period]}</span>
        </div>

        <PricingCurrencyBar currency={currency} onCurrencyChange={setCurrency} />

        <div className="pm-pricing-grid">
          {plans.map((plan) => {
            const rawDisplayPrice = plan.prices ? plan.prices[period] : plan.staticPrice ?? "";
            const displayPrice = plan.prices
              ? convertPriceString(rawDisplayPrice, currency)
              : rawDisplayPrice;
            return (
              <article
                key={plan.key}
                className={plan.popular ? "pm-plan-card is-popular" : "pm-plan-card"}
              >
                {plan.popular && <span className="pm-plan-badge">{popularLabel}</span>}
                <h3>{plan.name}</h3>
                <p className="pm-plan-desc">{plan.desc}</p>
                <div className="pm-plan-price">
                  <strong>{displayPrice}</strong>
                  {plan.prices && <span>{perMonth}</span>}
                </div>
                {plan.prices && (
                  <p className="pm-plan-setup">
                    {setupPrefix} <strong>{setupValue}</strong>
                  </p>
                )}
                <ul className="pm-plan-limits">
                  {plan.limits.map((limit) => (
                    <li key={limit}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        aria-hidden="true"
                      >
                        <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{limit}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={ctaHref}
                  data-track-cta="pricing"
                  className={plan.popular ? "pm-btn pm-btn-primary pm-btn-block" : "pm-btn pm-btn-outline pm-btn-block"}
                >
                  {plan.cta}
                </Link>
              </article>
            );
          })}
        </div>

        <p className="pm-pricing-footnote">{footnote}</p>
      </div>
    </section>
  );
}

export function MobileNavDrawer({
  links,
  signInLabel,
  signInHref,
  demoLabel,
  menuOpenLabel,
  menuCloseLabel,
}: {
  links: { href: string; label: string }[];
  signInLabel: string;
  signInHref: string;
  demoLabel: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pm-mobile-nav">
      <button
        type="button"
        className="pm-burger"
        aria-expanded={open}
        aria-label={open ? menuCloseLabel : menuOpenLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div className="pm-mobile-drawer">
          <nav className="pm-mobile-links">
            {links.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pm-mobile-actions">
            <Link href={signInHref} className="pm-btn pm-btn-outline" onClick={() => setOpen(false)}>
              {signInLabel}
            </Link>
            <a
              href="#contact"
              data-track-cta="mobile_sticky"
              className="pm-btn pm-btn-primary"
              onClick={() => setOpen(false)}
            >
              {demoLabel}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
