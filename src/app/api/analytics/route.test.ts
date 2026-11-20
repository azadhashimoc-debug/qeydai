import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST, resetAnalyticsRateLimit } from "./route";

let tmpDir: string;
let analyticsFile: string;

function req(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
    body,
  });
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(os.tmpdir(), "qeydai-analytics-"));
  analyticsFile = path.join(tmpDir, "analytics.jsonl");
  process.env.ANALYTICS_FILE = analyticsFile;
  process.env.TRUST_PROXY = "x-real-ip";
  resetAnalyticsRateLimit();
});

afterEach(() => {
  delete process.env.ANALYTICS_FILE;
  delete process.env.TRUST_PROXY;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("POST /api/analytics", () => {
  it("stores valid event without PII", async () => {
    const res = await POST(
      req(JSON.stringify({ event: "cta_clicked", props: { locale: "az", location: "hero_primary", target: "#contact" } }))
    );
    expect(res.status).toBe(202);
    const lines = readFileSync(analyticsFile, "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    const row = JSON.parse(lines[0]);
    expect(row.event).toBe("cta_clicked");
    expect(row.props).toEqual({ locale: "az", location: "hero_primary", target: "#contact" });
    expect(row.ts).toBeTruthy();
  });

  it("rejects non-JSON content type and cross-origin/cross-site requests", async () => {
    const r1 = await POST(req("{}", { "content-type": "text/plain" }));
    expect(r1.status).toBe(415);

    const r2 = await POST(req("{}", { origin: "https://evil.example" }));
    expect(r2.status).toBe(403);

    const r3 = await POST(req("{}", { "sec-fetch-site": "cross-site" }));
    expect(r3.status).toBe(403);
  });

  it("rejects oversized body and invalid/PII payloads", async () => {
    const big = JSON.stringify({ event: "page_viewed", props: { locale: "az", path: "/" + "a".repeat(1200) } });
    expect((await POST(req(big))).status).toBe(413);

    const pii = JSON.stringify({
      event: "lead_form_submitted",
      props: { locale: "az", name: "Secret", phone: "0501234567" },
    });
    expect((await POST(req(pii))).status).toBe(422);
  });

  it("invalid events do not consume the global analytics quota", async () => {
    for (let i = 0; i < 2005; i++) {
      const r = await POST(req("{}", { "x-real-ip": `198.51.${Math.floor(i / 250)}.${i % 250}` }));
      expect(r.status).toBe(422);
    }
    const valid = await POST(
      req(JSON.stringify({ event: "page_viewed", props: { locale: "az", path: "/az" } }), {
        "x-real-ip": "203.0.113.88",
      })
    );
    expect(valid.status).toBe(202);
  }, 15_000);
});
