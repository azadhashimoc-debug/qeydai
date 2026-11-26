import { simulatePaniReply } from "@/lib/ai/auto-reply";
import { isGroqConfigured } from "@/lib/ai/groq";
import { getWorkspaceAiSettings, type AiTone } from "@/lib/ai/settings-store";
import {
  fail,
  getPanelAuthConfig,
  getWorkspace,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

const VALID_TONES = new Set<AiTone>(["friendly", "professional", "concise"]);

export const POST = (req: Request) =>
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
    const sampleMessage = typeof b.message === "string" ? b.message.trim() : "";
    if (!sampleMessage || sampleMessage.length > 1500) {
      return fail(422, "invalid_input", { field: "message" });
    }

    if (!isGroqConfigured()) {
      return fail(503, "ai_not_configured");
    }

    return withWorkspace(member, async (actor, db) => {
      const [workspace, stored] = await Promise.all([
        getWorkspace(db, actor.tenantId),
        getWorkspaceAiSettings(db, actor.tenantId),
      ]);
      const draft = {
        model: typeof b.model === "string" && b.model.trim() ? b.model.trim() : stored.model,
        tone:
          typeof b.tone === "string" && VALID_TONES.has(b.tone as AiTone)
            ? (b.tone as AiTone)
            : stored.tone,
        businessContext:
          typeof b.businessContext === "string"
            ? b.businessContext.trim().slice(0, 8000)
            : stored.businessContext,
        systemPrompt:
          typeof b.systemPrompt === "string"
            ? b.systemPrompt.trim().slice(0, 4000)
            : stored.systemPrompt,
        handoffKeywords: Array.isArray(b.handoffKeywords)
          ? b.handoffKeywords.filter((k): k is string => typeof k === "string").slice(0, 30)
          : stored.handoffKeywords,
      };

      const started = Date.now();
      const result = await simulatePaniReply({
        businessName: workspace?.name || "panelim.az",
        locale: workspace?.locale || "az",
        settings: draft,
        sampleMessage,
      });
      if (!result.ok) {
        return fail(502, result.reason);
      }
      return json(200, {
        ok: true,
        reply: result.reply,
        model: result.model,
        handoffTriggered: result.handoffTriggered,
        ...(result.matchedKeyword ? { matchedKeyword: result.matchedKeyword } : {}),
        latencyMs: Date.now() - started,
      });
    });
  });
