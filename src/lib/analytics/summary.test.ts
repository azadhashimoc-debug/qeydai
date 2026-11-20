import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEmptyFunnelSummary, readAnalyticsSummary } from "./summary";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "qeydai-summary-"));
});

afterEach(() => {
  delete process.env.ANALYTICS_FILE;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("readAnalyticsSummary", () => {
  it("returns zeroed summary without throwing when the file does not exist", async () => {
    const missing = path.join(tmpDir, "does-not-exist.jsonl");
    await expect(readAnalyticsSummary(missing)).resolves.toEqual(createEmptyFunnelSummary());
  });

  it("aggregates funnel counts, locales, CTA locations, UTM sources, and experiments", async () => {
    const file = path.join(tmpDir, "analytics.jsonl");
    const lines = [
      JSON.stringify({
        event: "page_viewed",
        props: { locale: "az", path: "/az", utm_source: "meta", exp: "hero_cta_v1:benefit" },
        ts: "2026-11-18T10:00:00.000Z",
      }),
      JSON.stringify({
        event: "page_viewed",
        props: { locale: "en", path: "/en", utm_source: "google", exp: "hero_cta_v1:control" },
        ts: "2026-11-18T10:01:00.000Z",
      }),
      JSON.stringify({
        event: "page_viewed",
        props: { locale: "az", path: "/az", utm_source: "meta", exp: "hero_cta_v1:benefit" },
      }),
      JSON.stringify({
        event: "cta_clicked",
        props: { locale: "az", location: "hero_primary", target: "#contact", exp: "hero_cta_v1:benefit" },
      }),
      JSON.stringify({
        event: "cta_clicked",
        props: { locale: "en", location: "pricing", target: "#contact", exp: "hero_cta_v1:control" },
      }),
      JSON.stringify({
        event: "lead_form_started",
        props: { locale: "az", exp: "hero_cta_v1:benefit" },
      }),
      JSON.stringify({
        event: "lead_form_submitted",
        props: { locale: "az", exp: "hero_cta_v1:benefit", utm_source: "meta" },
      }),
      JSON.stringify({
        event: "lead_form_failed",
        props: { locale: "en", reason: "invalid_phone" },
      }),
      JSON.stringify({
        event: "scroll_depth_reached",
        props: { locale: "az", depth: 50 },
      }),
    ];
    writeFileSync(file, lines.join("\n") + "\n", "utf8");

    const summary = await readAnalyticsSummary(file);
    expect(summary).toEqual({
      totalEvents: 9,
      pageViews: 3,
      ctaClicks: 2,
      leadFormStarted: 1,
      leadFormSubmitted: 1,
      leadFormFailed: 1,
      byLocale: { az: 6, en: 3 },
      byCtaLocation: { hero_primary: 1, pricing: 1 },
      byUtmSource: { meta: 2, google: 1 },
      byExperiment: {
        "hero_cta_v1:benefit": { views: 2, ctaClicks: 1, leads: 1 },
        "hero_cta_v1:control": { views: 1, ctaClicks: 1, leads: 0 },
      },
    });
  });

  it("skips blank, malformed JSON, and non-event lines safely", async () => {
    const file = path.join(tmpDir, "messy.jsonl");
    writeFileSync(
      file,
      [
        "",
        "   ",
        "{not valid json",
        "12345",
        "null",
        JSON.stringify({ event: "page_viewed" }), // missing props
        JSON.stringify({ props: { locale: "az" } }), // missing event
        JSON.stringify({ event: "page_viewed", props: { locale: "az", path: "/az" } }),
        "{\"truncated\": true",
      ].join("\n"),
      "utf8",
    );

    const summary = await readAnalyticsSummary(file);
    expect(summary.totalEvents).toBe(1);
    expect(summary.pageViews).toBe(1);
    expect(summary.byLocale).toEqual({ az: 1, en: 0 });
  });

  it("defaults to process.env.ANALYTICS_FILE when no path argument is supplied", async () => {
    const file = path.join(tmpDir, "env-analytics.jsonl");
    writeFileSync(
      file,
      JSON.stringify({ event: "cta_clicked", props: { locale: "en", location: "header", target: "#contact" } }) + "\n",
      "utf8",
    );
    process.env.ANALYTICS_FILE = file;

    const summary = await readAnalyticsSummary();
    expect(summary.totalEvents).toBe(1);
    expect(summary.ctaClicks).toBe(1);
    expect(summary.byCtaLocation).toEqual({ header: 1 });
  });

  it("caps read size on files larger than 10 MiB without failing", async () => {
    const file = path.join(tmpDir, "large.jsonl");
    const line = JSON.stringify({ event: "page_viewed", props: { locale: "az", path: "/az", utm_source: "meta" } }) + "\n";
    const repeatCount = Math.ceil((11 * 1024 * 1024) / Buffer.byteLength(line, "utf8"));
    writeFileSync(file, line.repeat(repeatCount), "utf8");

    const summary = await readAnalyticsSummary(file);
    expect(summary.pageViews).toBeGreaterThan(0);
    expect(summary.pageViews).toBeLessThan(repeatCount);
    expect(summary.totalEvents).toBe(summary.pageViews);
    expect(summary.byUtmSource.meta).toBe(summary.pageViews);
  });
});
