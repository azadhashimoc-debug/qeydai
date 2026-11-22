import { fail, getPanelAuthConfig, json, requireBody, runPanelCRM, withWorkspace } from "@/lib/api/panel-crm";
import { configuredProviders } from "@/lib/ai/llm";
import { tenantKnowledge } from "@/lib/ai/auto-reply";
import { MAX_KNOWLEDGE_CHARS, getAiSettings, saveAiSettings } from "@/lib/ai/settings";
import { canWrite } from "@/lib/crm/store";

// Never returns API keys. The knowledge text is returned only to roles allowed to edit it.
export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const providers = configuredProviders().map((p) => ({ name: p.name, model: p.model }));
      const editable = canWrite(actor.role, "ai") && Boolean(process.env.QEYDAI_DATABASE_URL);
      const settings = process.env.QEYDAI_DATABASE_URL
        ? await getAiSettings(db, actor.tenantId)
        : (() => {
            const text = tenantKnowledge(actor.tenantId);
            return { enabled: true, knowledge: text ?? "", source: text ? ("env" as const) : ("none" as const) };
          })();
      const hasKnowledge = settings.knowledge.trim().length > 0;
      return json(200, {
        ok: true,
        active: providers.length > 0 && hasKnowledge && settings.enabled,
        providers,
        hasKnowledge,
        enabled: settings.enabled,
        source: settings.source,
        editable,
        maxChars: MAX_KNOWLEDGE_CHARS,
        knowledge: canWrite(actor.role, "ai") ? settings.knowledge : undefined,
      });
    }),
  );

export const PUT = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    if (!process.env.QEYDAI_DATABASE_URL) return fail(503, "database_unavailable");
    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!input || typeof input !== "object") return fail(400, "invalid_json");
    const b = input as Record<string, unknown>;
    if (typeof b.enabled !== "boolean") return fail(422, "invalid_input", { field: "enabled" });
    if (typeof b.knowledge !== "string" || b.knowledge.length > MAX_KNOWLEDGE_CHARS) {
      return fail(422, "invalid_input", { field: "knowledge" });
    }
    const patch = { enabled: b.enabled, knowledge: b.knowledge.trim() };
    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "ai")) return fail(403, "forbidden");
      await saveAiSettings(db, actor.tenantId, patch);
      return json(200, { ok: true });
    });
  });
