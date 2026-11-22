import { getPanelAuthConfig, json, runPanelCRM } from "@/lib/api/panel-crm";
import { configuredProviders } from "@/lib/ai/llm";
import { tenantKnowledge } from "@/lib/ai/auto-reply";

// Read-only status of the AI auto-reply for the signed-in workspace.
// Never returns keys or the knowledge text itself.
export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const providers = configuredProviders().map((p) => ({ name: p.name, model: p.model }));
    const hasKnowledge = tenantKnowledge(member.tenantId) !== null;
    return json(200, {
      ok: true,
      active: providers.length > 0 && hasKnowledge,
      providers,
      hasKnowledge,
    });
  });
