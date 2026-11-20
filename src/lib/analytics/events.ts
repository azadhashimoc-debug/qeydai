export const LOCALES = ["az", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const CTA_LOCATIONS = ["header", "hero_primary", "hero_secondary", "pricing", "mobile_sticky"] as const;
export type CtaLocation = (typeof CTA_LOCATIONS)[number];

export const CTA_TARGETS = ["#contact", "#how"] as const;
export type CtaTarget = (typeof CTA_TARGETS)[number];

export const FAQ_IDS = ["q1", "q2", "q3", "q4", "q5"] as const;
export type FaqId = (typeof FAQ_IDS)[number];

export const SCROLL_DEPTHS = [25, 50, 75, 100] as const;
export type ScrollDepth = (typeof SCROLL_DEPTHS)[number];

export const LEAD_FAIL_REASONS = [
  "name_required",
  "invalid_phone",
  "rate_limited",
  "server_error",
  "network_error",
] as const;
export type LeadFailReason = (typeof LEAD_FAIL_REASONS)[number];

export const WEB_VITAL_METRICS = ["TTFB", "FCP", "LCP", "CLS", "INP"] as const;
export type WebVitalMetric = (typeof WEB_VITAL_METRICS)[number];

export const WEB_VITAL_RATINGS = ["good", "needs-improvement", "poor"] as const;
export type WebVitalRating = (typeof WEB_VITAL_RATINGS)[number];

export type UtmProps = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type AnalyticsEvent =
  | {
      event: "page_viewed";
      props: { locale: Locale; path: string; referrer_host?: string; exp?: string } & UtmProps;
    }
  | {
      event: "cta_clicked";
      props: { locale: Locale; location: CtaLocation; target: CtaTarget; exp?: string };
    }
  | {
      event: "language_switched";
      props: { from_locale: Locale; to_locale: Locale; location: "header" };
    }
  | {
      event: "faq_toggled";
      props: { locale: Locale; faq_id: FaqId; open: boolean };
    }
  | {
      event: "scroll_depth_reached";
      props: { locale: Locale; depth: ScrollDepth };
    }
  | {
      event: "lead_form_started";
      props: { locale: Locale; exp?: string };
    }
  | {
      event: "lead_form_submitted";
      props: { locale: Locale; exp?: string } & Pick<UtmProps, "utm_source" | "utm_medium" | "utm_campaign">;
    }
  | {
      event: "lead_form_failed";
      props: { locale: Locale; reason: LeadFailReason };
    }
  | {
      event: "web_vital_measured";
      props: { locale: Locale; metric: WebVitalMetric; value: number; rating: WebVitalRating };
    };

const PATH_RE = /^\/[a-zA-Z0-9/_-]{0,120}$/;
const TOKEN_RE = /^[a-zA-Z0-9._-]{1,64}$/;
const EXP_RE = /^[a-z0-9_]{1,32}:[a-z0-9_-]{1,24}$/;
const HOST_RE = /^[a-zA-Z0-9.-]{1,120}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function inList<T extends readonly (string | number)[]>(v: unknown, list: T): v is T[number] {
  return (list as readonly (string | number)[]).includes(v as string | number);
}

function onlyKeys(obj: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(obj).every((k) => allowed.includes(k));
}

function cleanOptionalToken(v: unknown): string | undefined | null {
  if (v === undefined) return undefined;
  if (typeof v !== "string" || !TOKEN_RE.test(v)) return null;
  return v;
}

function cleanOptionalExp(v: unknown): string | undefined | null {
  if (v === undefined) return undefined;
  if (typeof v !== "string" || !EXP_RE.test(v)) return null;
  return v;
}

export function extractUtmProps(search: string): UtmProps {
  const params = new URLSearchParams(search);
  const out: UtmProps = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const val = params.get(k)?.trim();
    if (val && TOKEN_RE.test(val)) out[k] = val;
  }
  return out;
}

export function validateAnalyticsEvent(
  raw: unknown
): { ok: true; value: AnalyticsEvent } | { ok: false; error: "invalid_event" } {
  if (!isRecord(raw) || !onlyKeys(raw, ["event", "props"]) || !isRecord(raw.props)) {
    return { ok: false, error: "invalid_event" };
  }

  const event = raw.event;
  const p = raw.props;

  switch (event) {
    case "page_viewed": {
      const allowed = [
        "locale",
        "path",
        "referrer_host",
        "exp",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
      ] as const;
      if (!onlyKeys(p, allowed) || !inList(p.locale, LOCALES)) return { ok: false, error: "invalid_event" };
      if (typeof p.path !== "string" || !PATH_RE.test(p.path)) return { ok: false, error: "invalid_event" };
      if (p.referrer_host !== undefined && (typeof p.referrer_host !== "string" || !HOST_RE.test(p.referrer_host))) {
        return { ok: false, error: "invalid_event" };
      }
      const exp = cleanOptionalExp(p.exp);
      if (exp === null) return { ok: false, error: "invalid_event" };
      const out: Extract<AnalyticsEvent, { event: "page_viewed" }> = {
        event: "page_viewed",
        props: {
          locale: p.locale,
          path: p.path,
          ...(p.referrer_host ? { referrer_host: p.referrer_host } : {}),
          ...(exp ? { exp } : {}),
        },
      };
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
        const val = cleanOptionalToken(p[k]);
        if (val === null) return { ok: false, error: "invalid_event" };
        if (val !== undefined) out.props[k] = val;
      }
      return { ok: true, value: out };
    }

    case "cta_clicked": {
      if (
        !onlyKeys(p, ["locale", "location", "target", "exp"]) ||
        !inList(p.locale, LOCALES) ||
        !inList(p.location, CTA_LOCATIONS) ||
        !inList(p.target, CTA_TARGETS)
      ) {
        return { ok: false, error: "invalid_event" };
      }
      const exp = cleanOptionalExp(p.exp);
      if (exp === null) return { ok: false, error: "invalid_event" };
      return {
        ok: true,
        value: { event, props: { locale: p.locale, location: p.location, target: p.target, ...(exp ? { exp } : {}) } },
      };
    }

    case "language_switched": {
      if (
        !onlyKeys(p, ["from_locale", "to_locale", "location"]) ||
        !inList(p.from_locale, LOCALES) ||
        !inList(p.to_locale, LOCALES) ||
        p.from_locale === p.to_locale ||
        p.location !== "header"
      ) {
        return { ok: false, error: "invalid_event" };
      }
      return {
        ok: true,
        value: { event, props: { from_locale: p.from_locale, to_locale: p.to_locale, location: "header" } },
      };
    }

    case "faq_toggled": {
      if (
        !onlyKeys(p, ["locale", "faq_id", "open"]) ||
        !inList(p.locale, LOCALES) ||
        !inList(p.faq_id, FAQ_IDS) ||
        typeof p.open !== "boolean"
      ) {
        return { ok: false, error: "invalid_event" };
      }
      return {
        ok: true,
        value: { event, props: { locale: p.locale, faq_id: p.faq_id, open: p.open } },
      };
    }

    case "scroll_depth_reached": {
      if (!onlyKeys(p, ["locale", "depth"]) || !inList(p.locale, LOCALES) || !inList(p.depth, SCROLL_DEPTHS)) {
        return { ok: false, error: "invalid_event" };
      }
      return { ok: true, value: { event, props: { locale: p.locale, depth: p.depth } } };
    }

    case "lead_form_started": {
      if (!onlyKeys(p, ["locale", "exp"]) || !inList(p.locale, LOCALES)) {
        return { ok: false, error: "invalid_event" };
      }
      const exp = cleanOptionalExp(p.exp);
      if (exp === null) return { ok: false, error: "invalid_event" };
      return { ok: true, value: { event, props: { locale: p.locale, ...(exp ? { exp } : {}) } } };
    }

    case "lead_form_submitted": {
      if (!onlyKeys(p, ["locale", "exp", "utm_source", "utm_medium", "utm_campaign"]) || !inList(p.locale, LOCALES)) {
        return { ok: false, error: "invalid_event" };
      }
      const exp = cleanOptionalExp(p.exp);
      if (exp === null) return { ok: false, error: "invalid_event" };
      const out: Extract<AnalyticsEvent, { event: "lead_form_submitted" }> = {
        event,
        props: { locale: p.locale, ...(exp ? { exp } : {}) },
      };
      for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
        const val = cleanOptionalToken(p[k]);
        if (val === null) return { ok: false, error: "invalid_event" };
        if (val !== undefined) out.props[k] = val;
      }
      return { ok: true, value: out };
    }

    case "lead_form_failed": {
      if (!onlyKeys(p, ["locale", "reason"]) || !inList(p.locale, LOCALES) || !inList(p.reason, LEAD_FAIL_REASONS)) {
        return { ok: false, error: "invalid_event" };
      }
      return { ok: true, value: { event, props: { locale: p.locale, reason: p.reason } } };
    }

    case "web_vital_measured": {
      if (
        !onlyKeys(p, ["locale", "metric", "value", "rating"]) ||
        !inList(p.locale, LOCALES) ||
        !inList(p.metric, WEB_VITAL_METRICS) ||
        !inList(p.rating, WEB_VITAL_RATINGS) ||
        typeof p.value !== "number" ||
        !Number.isFinite(p.value) ||
        p.value < 0 ||
        p.value > 600_000
      ) {
        return { ok: false, error: "invalid_event" };
      }
      return {
        ok: true,
        value: { event, props: { locale: p.locale, metric: p.metric, value: Math.round(p.value * 1000) / 1000, rating: p.rating } },
      };
    }

    default:
      return { ok: false, error: "invalid_event" };
  }
}
