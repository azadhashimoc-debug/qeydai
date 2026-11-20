import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSharedStore } from "@/lib/api/instance";
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
  const dir = mkdtempSync(path.join(tmpdir(), "lead-"));
  const f = path.join(dir, "l.jsonl");
  process.env.LEADS_FILE = f;
  process.env.ENROLL_DB_FILE = ":memory:";
  return f;
}

beforeEach(() => {
  resetLeadRateLimit();
  process.env.TRUST_PROXY = "x-forwarded-for";
  process.env.ENROLL_DB_FILE = ":memory:";
});

afterEach(() => {
  delete process.env.TRUST_PROXY;
  delete process.env.QEYDAI_PUBLIC_LEAD_TENANT;
});

describe("POST /api/lead", () => {
  it("stores a valid lead and syncs it to the panel CRM store", async () => {
    const f = tmpFile();
    process.env.QEYDAI_PUBLIC_LEAD_TENANT = "pilot_center";
    const res = await POST(req({ body: good }));
    expect(res.status).toBe(200);
    expect(JSON.parse(readFileSync(f, "utf8").trim()).phone).toBe("+994501234567");
    const leads = await getSharedStore().listLeads("pilot_center");
    expect(leads.some((l) => l.phone === "+994501234567" && l.source === "web")).toBe(true);
  });
  it("returns an error when the lead cannot be saved to the panel store", async () => {
    tmpFile();
    const write = vi.spyOn(getSharedStore(), "upsertLead").mockRejectedValueOnce(new Error("CRM unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await POST(req({ body: good }));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ ok: false, error: "server_error" });
    } finally {
      write.mockRestore();
      log.mockRestore();
    }
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
