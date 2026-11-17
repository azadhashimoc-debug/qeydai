import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { POST, resetLeadRateLimit } from "./route";

type Opts = { body?: unknown; raw?: string; headers?: Record<string, string> };
const req = ({ body, raw, headers }: Opts) =>
  new Request("http://site.test/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", host: "site.test", ...headers },
    body: raw ?? JSON.stringify(body),
  });
const good = { name: "Aygün", phone: "050 123 45 67" };

function tmpFile() {
  const f = path.join(mkdtempSync(path.join(tmpdir(), "lead-")), "l.jsonl");
  process.env.LEADS_FILE = f;
  return f;
}

beforeEach(() => resetLeadRateLimit());

describe("POST /api/lead", () => {
  it("stores a valid lead", async () => {
    const f = tmpFile();
    const res = await POST(req({ body: good }));
    expect(res.status).toBe(200);
    expect(JSON.parse(readFileSync(f, "utf8").trim()).phone).toBe("+994501234567");
  });
  it("rejects invalid lead and writes nothing", async () => {
    const f = tmpFile();
    expect((await POST(req({ body: { name: "", phone: "1" } }))).status).toBe(400);
    expect((await POST(req({ raw: "not json" }))).status).toBe(400);
    expect(existsSync(f)).toBe(false);
  });
  it("requires application/json content type (blocks cross-site form posts)", async () => {
    const f = tmpFile();
    const res = await POST(req({ body: good, headers: { "content-type": "text/plain" } }));
    expect(res.status).toBe(415);
    expect(existsSync(f)).toBe(false);
  });
  it("rejects cross-origin browser requests", async () => {
    const f = tmpFile();
    const res = await POST(req({ body: good, headers: { origin: "https://evil.example" } }));
    expect(res.status).toBe(403);
    expect(existsSync(f)).toBe(false);
  });
  it("accepts same-origin browser requests", async () => {
    tmpFile();
    const res = await POST(req({ body: good, headers: { origin: "http://site.test" } }));
    expect(res.status).toBe(200);
  });
  it("rejects oversized bodies", async () => {
    const f = tmpFile();
    const res = await POST(req({ raw: JSON.stringify({ ...good, pad: "x".repeat(5000) }) }));
    expect(res.status).toBe(413);
    expect(existsSync(f)).toBe(false);
  });
  it("rate limits repeated submissions per client", async () => {
    tmpFile();
    const h = { "x-forwarded-for": "203.0.113.9" };
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) {
      codes.push((await POST(req({ body: { name: `P${i}`, phone: `050 123 45 6${i}` }, headers: h }))).status);
    }
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes.slice(5)).toEqual([429, 429]);
  });
  it("different clients are not limited together", async () => {
    tmpFile();
    for (let i = 0; i < 5; i++) await POST(req({ body: good, headers: { "x-forwarded-for": "198.51.100.1" } }));
    const res = await POST(req({ body: good, headers: { "x-forwarded-for": "198.51.100.2" } }));
    expect(res.status).toBe(200);
  });
});
