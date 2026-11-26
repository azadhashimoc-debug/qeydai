import { generateGroqReply, isGroqConfigured } from "@/lib/ai/groq";
import { getWorkspaceAiSettings, incrementAiUsage } from "@/lib/ai/settings-store";
import {
  fail,
  getPanelAuthConfig,
  getWorkspace,
  json,
  listDeals,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { listStages } from "@/lib/crm/store";

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
    const question = typeof b.question === "string" ? b.question.trim() : "";
    const locale = b.locale === "en" ? "en" : "az";
    if (!question || question.length > 1000) {
      return fail(422, "invalid_input", { field: "question" });
    }

    return withWorkspace(member, async (actor, db) => {
      const [workspace, deals, stages, settings] = await Promise.all([
        getWorkspace(db, actor.tenantId),
        listDeals(db, actor.tenantId),
        listStages(db, actor.tenantId),
        getWorkspaceAiSettings(db, actor.tenantId),
      ]);

      const byStage = stages.map((st) => ({
        name: st.name,
        kind: st.kind,
        count: deals.filter((d) => d.stageId === st.id).length,
      }));
      const bySource = new Map<string, number>();
      for (const deal of deals) {
        bySource.set(deal.source, (bySource.get(deal.source) ?? 0) + 1);
      }
      const unassigned = deals.filter((d) => !d.assigneeId).length;
      const won = deals.filter((d) => d.stageKind === "won").length;
      const totalAmount = deals.reduce((sum, d) => sum + d.amountMinor, 0) / 100;

      const snapshot = {
        workspace: workspace?.name ?? actor.tenantId,
        currency: workspace?.currency ?? "AZN",
        totalDeals: deals.length,
        wonDeals: won,
        unassignedDeals: unassigned,
        pipelineValue: Number(totalAmount.toFixed(2)),
        stages: byStage,
        sources: Object.fromEntries(bySource.entries()),
      };

      if (!isGroqConfigured()) {
        return json(200, {
          ok: true,
          mode: "fallback",
          snapshot,
          reply: null,
        });
      }

      const aiRes = await generateGroqReply({
        model: settings.model,
        maxTokens: 450,
        messages: [
          {
            role: "system",
            content: [
              `You are Pani, an executive CRM analyst and sales copilot inside panelim.az for "${snapshot.workspace}".`,
              `Respond in ${locale === "en" ? "English" : "Azerbaijani"}.`,
              "Use ONLY the live CRM snapshot JSON provided below. Be concrete, actionable, and concise (3-6 sentences or bullet points).",
              "Live CRM snapshot:",
              JSON.stringify(snapshot),
            ].join("\n"),
          },
          { role: "user", content: question },
        ],
      });

      if (!aiRes.ok) {
        return json(200, {
          ok: true,
          mode: "fallback",
          snapshot,
          reply: null,
        });
      }

      await incrementAiUsage(db, actor.tenantId, {
        copilot: 1,
        tokensIn: aiRes.tokensIn,
        tokensOut: aiRes.tokensOut,
      }).catch(() => undefined);

      return json(200, {
        ok: true,
        mode: "ai",
        model: aiRes.model,
        reply: aiRes.reply,
      });
    });
  });
