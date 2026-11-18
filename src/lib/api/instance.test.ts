import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getEnrollApi, parseKeys } from "./instance";

const STRONG = "k".repeat(32);

describe("parseKeys", () => {
  it("parses a JSON map of key -> tenant", () => {
    expect(parseKeys(JSON.stringify({ [STRONG]: "center_001" }))).toEqual({ [STRONG]: "center_001" });
  });
  it("returns an empty map (fail closed) for missing or invalid input", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseKeys(undefined)).toEqual({});
    expect(parseKeys("")).toEqual({});
    expect(parseKeys("not json")).toEqual({});
    expect(parseKeys("[1,2]")).toEqual({});
    spy.mockRestore();
  });
  it("drops weak keys (shorter than 24 chars) and bad tenants, without printing the key", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = parseKeys(JSON.stringify({ "weakkey-xyz": "t1", [STRONG]: "ok", [STRONG + "2"]: "" }));
    expect(out).toEqual({ [STRONG]: "ok" });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("weakkey-xyz");
    spy.mockRestore();
  });
});

describe("getEnrollApi during next build", () => {
  it("does not open or create the database, and answers 503", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "qeydai-build-")), "should-not-exist.sqlite");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("ENROLL_DB_FILE", file);
    try {
      const res = await getEnrollApi().listSessions(new Request("http://x/api/v1/sessions"));
      expect(res.status).toBe(503);
      expect(existsSync(file)).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
