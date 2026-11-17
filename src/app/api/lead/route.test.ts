import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://x/api/lead", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("POST /api/lead", () => {
  it("stores a valid lead", async () => {
    const f = path.join(mkdtempSync(path.join(tmpdir(), "lead-")), "l.jsonl");
    process.env.LEADS_FILE = f;
    const res = await POST(req({ name: "Aygün", phone: "050 123 45 67" }));
    expect(res.status).toBe(200);
    expect(JSON.parse(readFileSync(f, "utf8").trim()).phone).toBe("+994501234567");
  });
  it("rejects invalid lead and writes nothing", async () => {
    const f = path.join(mkdtempSync(path.join(tmpdir(), "lead-")), "l.jsonl");
    process.env.LEADS_FILE = f;
    expect((await POST(req({ name: "", phone: "1" }))).status).toBe(400);
    expect((await POST(req("not json"))).status).toBe(400);
    expect(existsSync(f)).toBe(false);
  });
});
