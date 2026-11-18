import { describe, expect, it, vi } from "vitest";
import { parseKeys } from "./instance";

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
