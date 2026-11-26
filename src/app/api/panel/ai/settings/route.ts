import { getDefaultGroqModel, isGroqConfigured } from "@/lib/ai/groq";
import {
  getMonthlyAiUsage,
  getWorkspaceAiSettings,
  upsertWorkspaceAiSettings,
  type AiTone,
} from "@/lib/ai/settings-store";
import {
  fail,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

const VALID_TONES = new Set<AiTone>(["friendly", "professional", "concise"]);
const MODEL_RE = /^[A-Za-z0-9._/-]{2,100}$/;

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const [settings, usage] = await Promise.all([
        getWorkspaceAiSettings(db, actor.tenantId),
        getMonthlyAiUsage(db, actor.tenantId),
      ]);
      return json(200, {
        ok: true,
        aiConfigured: isGroqConfigured(),
        defaultModel: getDefaultGroqModel(),
        settings,
        usage,
      });
    }),
  );

const updateHandler = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail(400, "invalid_json");
    }
    const b = parsed as Record<string, unknown>;
    const patch: Parameters<typeof upsertWorkspaceAiSettings>[2] = {};

    if (b.enabled !== undefined) {
      if (typeof b.enabled !== "boolean") return fail(422, "invalid_input", { field: "enabled" });
      patch.enabled = b.enabled;
    }
    if (b.model !== undefined) {
      if (typeof b.model !== "string" || !MODEL_RE.test(b.model.trim())) {
        return fail(422, "invalid_input", { field: "model" });
      }
      patch.model = b.model.trim();
    }
    if (b.tone !== undefined) {
      if (typeof b.tone !== "string" || !VALID_TONES.has(b.tone as AiTone)) {
        return fail(422, "invalid_input", { field: "tone" });
      }
      patch.tone = b.tone as AiTone;
    }
    if (b.businessContext !== undefined) {
      if (typeof b.businessContext !== "string" || b.businessContext.length > 8000) {
        return fail(422, "invalid_input", { field: "businessContext" });
      }
      patch.businessContext = b.businessContext.trim();
    }
    if (b.systemPrompt !== undefined) {
      if (typeof b.systemPrompt !== "string" || b.systemPrompt.length > 4000) {
        return fail(422, "invalid_input", { field: "systemPrompt" });
      }
      patch.systemPrompt = b.systemPrompt.trim();
    }
    if (b.handoffKeywords !== undefined) {
      if (!Array.isArray(b.handoffKeywords) || b.handoffKeywords.length > 30) {
        return fail(422, "invalid_input", { field: "handoffKeywords" });
      }
      const cleaned = b.handoffKeywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim())
        .filter((k) => k.length >= 2 && k.length <= 40);
      patch.handoffKeywords = Array.from(new Set(cleaned));
    }
    if (b.maxRepliesPerThread !== undefined) {
      const n = Number(b.maxRepliesPerThread);
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        return fail(422, "invalid_input", { field: "maxRepliesPerThread" });
      }
      patch.maxRepliesPerThread = n;
    }

    return withWorkspace(member, async (actor, db) => {
      if (actor.role !== "owner" && actor.role !== "manager") return fail(403, "forbidden");
      const settings = await upsertWorkspaceAiSettings(db, actor.tenantId, patch);
      const usage = await getMonthlyAiUsage(db, actor.tenantId);
      return json(200, {
        ok: true,
        aiConfigured: isGroqConfigured(),
        settings,
        usage,
      });
    });
  });

export const PUT = updateHandler;
export const PATCH = updateHandler;
