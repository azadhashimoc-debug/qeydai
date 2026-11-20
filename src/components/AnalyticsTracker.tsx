"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";
import {
  CTA_LOCATIONS,
  CTA_TARGETS,
  FAQ_IDS,
  LOCALES,
  SCROLL_DEPTHS,
  type CtaLocation,
  type CtaTarget,
  type FaqId,
  type Locale,
  type ScrollDepth,
  extractUtmProps,
} from "@/lib/analytics/events";
import { assignExperimentVariant, formatExperimentToken } from "@/lib/experiments/ab";

function safeReferrerHost(): string | undefined {
  if (typeof document === "undefined" || !document.referrer) return undefined;
  try {
    const refHost = new URL(document.referrer).hostname;
    if (!refHost || refHost === window.location.hostname) return undefined;
    return refHost;
  } catch {
    return undefined;
  }
}

export function AnalyticsTracker({ locale }: { locale: Locale }) {
  const viewedRef = useRef<string | null>(null);

  useEffect(() => {
    const variant = assignExperimentVariant("hero_cta_v1");
    const exp = formatExperimentToken("hero_cta_v1", variant);
    document.documentElement.dataset.expHeroCta = variant;

    const path = window.location.pathname;
    const key = `${locale}:${path}`;
    if (viewedRef.current !== key) {
      viewedRef.current = key;
      const utm = extractUtmProps(window.location.search);
      const referrer_host = safeReferrerHost();
      trackEvent({
        event: "page_viewed",
        props: {
          locale,
          path,
          exp,
          ...(referrer_host ? { referrer_host } : {}),
          ...utm,
        },
      });
    }

    const seenDepths = new Set<ScrollDepth>();
    let rafId = 0;

    const measureScroll = () => {
      rafId = 0;
      const doc = document.documentElement;
      const total = doc.scrollHeight;
      if (total <= 0) return;
      const pct = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100));
      for (const depth of SCROLL_DEPTHS) {
        if (pct >= depth && !seenDepths.has(depth)) {
          seenDepths.add(depth);
          trackEvent({ event: "scroll_depth_reached", props: { locale, depth } });
        }
      }
      if (seenDepths.size === SCROLL_DEPTHS.length) {
        window.removeEventListener("scroll", onScroll);
      }
    };

    const onScroll = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(measureScroll);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const cta = target.closest<HTMLElement>("[data-track-cta]");
      if (cta) {
        const location = cta.dataset.trackCta;
        const href = cta.getAttribute("href");
        if (
          (CTA_LOCATIONS as readonly string[]).includes(location ?? "") &&
          (CTA_TARGETS as readonly string[]).includes(href ?? "")
        ) {
          trackEvent({
            event: "cta_clicked",
            props: {
              locale,
              location: location as CtaLocation,
              target: href as CtaTarget,
              exp,
            },
          });
        }
      }

      const langLink = target.closest<HTMLElement>("[data-track-lang]");
      if (langLink) {
        const to = langLink.dataset.trackLang;
        if ((LOCALES as readonly string[]).includes(to ?? "") && to !== locale) {
          trackEvent({
            event: "language_switched",
            props: {
              from_locale: locale,
              to_locale: to as Locale,
              location: "header",
            },
          });
        }
      }
    };

    const onToggle = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLDetailsElement)) return;
      const faqId = el.dataset.trackFaq;
      if ((FAQ_IDS as readonly string[]).includes(faqId ?? "")) {
        trackEvent({
          event: "faq_toggled",
          props: {
            locale,
            faq_id: faqId as FaqId,
            open: el.open,
          },
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onToggle, true);
    measureScroll();

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, [locale]);

  return null;
}
