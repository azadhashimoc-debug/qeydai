import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST, resetLeadRateLimit } from "./route";

const good = { name: "Aygün", phone: "050 123 45 67" };
const mk = (headers: Record<string, string> = {}, body: string = JSON.stringify(good)) =>
  new Request("http://site.test/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", host: "site.test", ...headers },
    body,
  });
const tmpDir = () => mkdtempSync(path.join(tmpdir(), "lead-"));

beforeEach(() => {
  resetLeadRateLimit();
  process.env.LEADS_FILE = path.join(tmpDir(), "l.jsonl");
  process.env.ENROLL_DB_FILE = ":memory:";
  process.env.TRUST_PROXY = "x-real-ip";
});

afterEach(() => {
  delete process.env.TRUST_PROXY;
});

describe("route review fixes", () => {
  it("rejects early from Content-Length without trusting the body", async () => {
    const res = await POST(mk({ "content-length": "999999" }));
    expect(res.status).toBe(413);
    expect(existsSync(process.env.LEADS_FILE!)).toBe(false);
  });
  it("returns a structured 500 (not a thrown error) when storage fails", async () => {
    const blocker = path.join(tmpDir(), "afile");
    writeFileSync(blocker, "x");
    process.env.LEADS_FILE = path.join(blocker, "sub", "l.jsonl"); // parent is a file -> mkdir fails
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(mk());
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "server_error" });
  });
  it("ignores spoofed left-most X-Forwarded-For entries (uses the proxy-added last hop)", async () => {
    process.env.TRUST_PROXY = "x-forwarded-for";
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await POST(mk({ "x-forwarded-for": `spoof-${i}, 203.0.113.9` }))).status);
    expect(codes.slice(5)).toEqual([429, 429]);
  });
  it("x-real-ip takes precedence when present", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await POST(mk({ "x-real-ip": "198.51.100.7", "x-forwarded-for": `s${i}` }))).status);
    expect(codes.slice(5)).toEqual([429, 429]);
  });
  it("applies a global cap so rotating clients cannot flood storage", async () => {
    let limited = 0;
    for (let i = 0; i < 260; i++) {
      const res = await POST(mk({ "x-real-ip": `10.0.${Math.floor(i / 250)}.${i % 250}` }));
      if (res.status === 429) limited++;
    }
    expect(limited).toBeGreaterThan(0);
  }, 30_000); // 260 sequential file-backed requests; ~3 s alone, can exceed 5 s when all test files run in parallel
  it("invalid payloads do not consume the global lead quota", async () => {
    for (let i = 0; i < 205; i++) {
      const r = await POST(mk({ "x-real-ip": `198.51.100.${i}` }, "{}"));
      expect(r.status).toBe(400);
    }
    const valid = await POST(mk({ "x-real-ip": "203.0.113.50" }));
    expect(valid.status).toBe(200);
    expect(valid.headers.get("cache-control")).toBe("no-store");
  }, 30_000);
  it("rejects sec-fetch-site: cross-site and sets cache-control: no-store on errors", async () => {
    const res = await POST(mk({ "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

