import { describe, expect, it } from "vitest";
import { extractUtmProps, validateAnalyticsEvent } from "./events";

describe("validateAnalyticsEvent", () => {
  it("accepts valid page_viewed with UTM params", () => {
    const res = validateAnalyticsEvent({
      event: "page_viewed",
      props: {
        locale: "az",
        path: "/az",
        referrer_host: "google.com",
        utm_source: "meta",
        utm_medium: "cpc",
        utm_campaign: "az_pilot_nov",
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.props).toEqual({
      locale: "az",
      path: "/az",
      referrer_host: "google.com",
      utm_source: "meta",
      utm_medium: "cpc",
      utm_campaign: "az_pilot_nov",
    });
  });

  it("rejects unknown events and PII fields", () => {
    expect(validateAnalyticsEvent({ event: "custom_hack", props: {} }).ok).toBe(false);
    expect(
      validateAnalyticsEvent({
        event: "lead_form_submitted",
        props: { locale: "az", name: "Aygün", phone: "+994501234567" },
      }).ok
    ).toBe(false);
    expect(
      validateAnalyticsEvent({
        event: "lead_form_started",
        props: { locale: "az" },
        extra: "noise",
      }).ok
    ).toBe(false);
  });

  it("rejects control characters, newlines, and query strings in path/UTM", () => {
    expect(
      validateAnalyticsEvent({
        event: "page_viewed",
        props: { locale: "az", path: "/az?phone=0501234567" },
      }).ok
    ).toBe(false);
    expect(
      validateAnalyticsEvent({
        event: "page_viewed",
        props: { locale: "az", path: "/az", utm_source: "bad\ninjection" },
      }).ok
    ).toBe(false);
  });

  it("validates web_vital_measured bounds", () => {
    expect(
      validateAnalyticsEvent({
        event: "web_vital_measured",
        props: { locale: "en", metric: "LCP", value: 1234.5678, rating: "good" },
      })
    ).toEqual({
      ok: true,
      value: {
        event: "web_vital_measured",
        props: { locale: "en", metric: "LCP", value: 1234.568, rating: "good" },
      },
    });
    expect(
      validateAnalyticsEvent({
        event: "web_vital_measured",
        props: { locale: "en", metric: "LCP", value: -1, rating: "good" },
      }).ok
    ).toBe(false);
  });

  it("accepts valid exp token on funnel events and rejects invalid exp tokens", () => {
    const ok = validateAnalyticsEvent({
      event: "cta_clicked",
      props: { locale: "az", location: "hero_primary", target: "#contact", exp: "hero_cta_v1:benefit" },
    });
    expect(ok).toEqual({
      ok: true,
      value: {
        event: "cta_clicked",
        props: { locale: "az", location: "hero_primary", target: "#contact", exp: "hero_cta_v1:benefit" },
      },
    });
    expect(
      validateAnalyticsEvent({
        event: "cta_clicked",
        props: { locale: "az", location: "hero_primary", target: "#contact", exp: "bad value!" },
      }).ok,
    ).toBe(false);
  });
});

describe("extractUtmProps", () => {
  it("extracts safe UTM parameters and drops unsafe values", () => {
    expect(extractUtmProps("?utm_source=meta&utm_medium=cpc&utm_campaign=nov_2026&utm_term=bad%20space&foo=bar")).toEqual({
      utm_source: "meta",
      utm_medium: "cpc",
      utm_campaign: "nov_2026",
    });
  });
});
