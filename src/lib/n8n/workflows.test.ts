import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FILES = [
  "n8n/workflows/01-telegram-ai-enrollment.json",
  "n8n/workflows/02-lead-form-notify.json",
] as const;

type WorkflowNode = {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
};

type WorkflowDoc = {
  name: string;
  active: boolean;
  settings?: { executionOrder?: string };
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
};

describe("n8n workflow templates", () => {
  it.each(FILES)("%s is valid n8n v1 workflow JSON without hardcoded secrets", (relPath) => {
    const full = path.resolve(process.cwd(), relPath);
    expect(existsSync(full)).toBe(true);
    const raw = readFileSync(full, "utf8");

    // Must not hardcode API keys, Bearer tokens, or Telegram bot tokens
    expect(raw).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{12,}/i);
    expect(raw).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    expect(raw).not.toMatch(/\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/);

    const wf = JSON.parse(raw) as WorkflowDoc;
    expect(wf.active).toBe(false);
    expect(wf.settings?.executionOrder).toBe("v1");
    expect(Array.isArray(wf.nodes)).toBe(true);
    expect(wf.nodes.length).toBeGreaterThanOrEqual(4);
    expect(wf.nodes.some((n) => n.type === "n8n-nodes-base.errorTrigger")).toBe(true);
    for (const node of wf.nodes) {
      expect(typeof node.id).toBe("string");
      expect(typeof node.name).toBe("string");
      expect(typeof node.type).toBe("string");
    }
  });

  it("01-telegram-ai-enrollment enforces deterministic API outcome mapping and timeouts", () => {
    const raw = readFileSync(path.resolve(process.cwd(), FILES[0]), "utf8");
    const wf = JSON.parse(raw) as WorkflowDoc;
    const httpNodes = wf.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest");
    expect(httpNodes.length).toBeGreaterThanOrEqual(3);

    for (const n of httpNodes) {
      expect(n.credentials).toBeDefined();
      const opts = (n.parameters?.options ?? {}) as Record<string, unknown>;
      expect(typeof opts.timeout).toBe("number");
      expect(opts.timeout as number).toBeLessThanOrEqual(15_000);
    }

    expect(raw).toContain("/api/v1/sessions");
    expect(raw).toContain("/api/v1/enroll");
    expect(raw).toContain("session_started");
    expect(raw).toContain("duplicate");
  });

  it("02-lead-form-notify reads webhook payload from $json.body", () => {
    const raw = readFileSync(path.resolve(process.cwd(), FILES[1]), "utf8");
    expect(raw).toContain("$json.body");
  });
});
