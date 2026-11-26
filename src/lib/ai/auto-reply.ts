import { randomUUID } from "node:crypto";
import { getWorkspace, isPostgresConfigured, workspaceTransaction } from "../crm/store";
import { reportServerError } from "../observability/alerts";
import { generateGroqReply, isGroqConfigured, type GroqChatMessage } from "./groq";
import {
  getMonthlyAiUsage,
  getWorkspaceAiSettings,
  incrementAiUsage,
  type AiTone,
  type WorkspaceAiSettings,
} from "./settings-store";

const TONE_GUIDANCE: Record<AiTone, string> = {
  friendly: "Use a warm, approachable, helpful tone.",
  professional: "Use a polite, formal, business-appropriate tone.",
  concise: "Keep answers very short, direct, and easy to read on mobile.",
};

export function matchesHandoffKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const raw of keywords) {
    const kw = raw.trim().toLowerCase();
    if (kw.length >= 2 && lower.includes(kw)) {
      return kw;
    }
  }
  return null;
}

export function buildPaniSystemPrompt(input: {
  businessName: string;
  locale: string;
  settings: Pick<WorkspaceAiSettings, "tone" | "businessContext" | "systemPrompt">;
}): string {
  const parts = [
    `You are Pani, the AI customer sales and support assistant for "${input.businessName}".`,
    "Always reply in the same language as the customer's latest message (default to Azerbaijani if unclear, or English if the customer writes in English).",
    TONE_GUIDANCE[input.settings.tone] ?? TONE_GUIDANCE.friendly,
    "Rules:",
    "- Never invent prices, policies, discounts, or appointment times that are not stated in the business context.",
    "- If the customer asks something outside your knowledge or wants human assistance, politely let them know a human specialist will follow up shortly.",
    "- Keep replies concise (1-4 short sentences) and suitable for WhatsApp, Instagram DM, or Telegram.",
    "- Do not use markdown tables or raw HTML.",
  ];
  if (input.settings.businessContext.trim()) {
    parts.push("", "Business context (products, pricing, hours, FAQ):", input.settings.businessContext.trim());
  }
  if (input.settings.systemPrompt.trim()) {
    parts.push("", "Additional workspace instructions:", input.settings.systemPrompt.trim());
  }
  return parts.join("\n");
}

export type AutoReplyOutcome =
  | { replied: true; messageId: string; model: string }
  | { replied: false; reason: string };

/**
 * Evaluates an inbound customer message and, if Pani AI auto-reply is enabled for both
 * the workspace and channel connection, generates a Groq reply and queues it into sales_outbox.
 */
export async function maybeAutoReplyInbound(input: {
  tenantId: string;
  dealId: string;
  threadId: string;
  connectionId: string;
  inboundText: string;
  fetchImpl?: typeof fetch;
}): Promise<AutoReplyOutcome> {
  if (!isGroqConfigured()) return { replied: false, reason: "ai_not_configured" };
  if (!isPostgresConfigured()) return { replied: false, reason: "postgres_required" };

  try {
    const context = await workspaceTransaction(input.tenantId, async (db) => {
      const settings = await getWorkspaceAiSettings(db, input.tenantId);
      if (!settings.enabled) return { skip: "ai_disabled" as const };

      const connRes = await db.query<{ active: boolean; automation_enabled: boolean }>(
        `SELECT active, automation_enabled
         FROM sales_connections
         WHERE tenant_id = $1 AND id = $2`,
        [input.tenantId, input.connectionId],
      );
      const conn = connRes.rows[0];
      if (!conn?.active || !conn.automation_enabled) {
        return { skip: "connection_automation_disabled" as const };
      }

      const threadRes = await db.query<{ mode: string }>(
        `SELECT mode FROM sales_threads WHERE tenant_id = $1 AND id = $2`,
        [input.tenantId, input.threadId],
      );
      const threadMode = threadRes.rows[0]?.mode ?? "operator";

      // Check if a human staff member has already replied in this thread.
      const staffCountRes = await db.query<{ cnt: string }>(
        `SELECT count(*)::text AS cnt FROM sales_messages
         WHERE tenant_id = $1 AND thread_id = $2 AND sender = 'staff'`,
        [input.tenantId, input.threadId],
      );
      const hasStaffReply = Number(staffCountRes.rows[0]?.cnt ?? 0) > 0;
      if (hasStaffReply && threadMode === "operator") {
        return { skip: "operator_takeover" as const };
      }

      // Check handoff keywords before generating an AI reply.
      const matchedKeyword = matchesHandoffKeyword(input.inboundText, settings.handoffKeywords);
      if (matchedKeyword) {
        await db.query(
          `UPDATE sales_threads SET mode = 'operator' WHERE tenant_id = $1 AND id = $2`,
          [input.tenantId, input.threadId],
        );
        return { skip: "handoff_keyword" as const };
      }

      // Check monthly workspace quota and per-thread AI reply cap.
      const usage = await getMonthlyAiUsage(db, input.tenantId);
      if (usage.repliesCount >= settings.monthlyReplyLimit) {
        return { skip: "monthly_limit_reached" as const };
      }

      const aiCountRes = await db.query<{ cnt: string }>(
        `SELECT count(*)::text AS cnt FROM sales_messages
         WHERE tenant_id = $1 AND thread_id = $2 AND sender = 'ai'`,
        [input.tenantId, input.threadId],
      );
      if (Number(aiCountRes.rows[0]?.cnt ?? 0) >= settings.maxRepliesPerThread) {
        await db.query(
          `UPDATE sales_threads SET mode = 'operator' WHERE tenant_id = $1 AND id = $2`,
          [input.tenantId, input.threadId],
        );
        return { skip: "thread_cap_reached" as const };
      }

      if (threadMode !== "bot") {
        await db.query(
          `UPDATE sales_threads SET mode = 'bot' WHERE tenant_id = $1 AND id = $2`,
          [input.tenantId, input.threadId],
        );
      }

      const workspace = await getWorkspace(db, input.tenantId);
      const historyRes = await db.query<{ direction: string; body: string }>(
        `SELECT direction, body
         FROM (
           SELECT direction, body, created_at, id
           FROM sales_messages
           WHERE tenant_id = $1 AND thread_id = $2
           ORDER BY created_at DESC, id DESC
           LIMIT 8
         ) recent
         ORDER BY created_at ASC, id ASC`,
        [input.tenantId, input.threadId],
      );

      return {
        skip: null,
        settings,
        businessName: workspace?.name || "panelim.az",
        locale: workspace?.locale || "az",
        history: historyRes.rows,
      };
    });

    if (context.skip) return { replied: false, reason: context.skip };

    const messages: GroqChatMessage[] = [
      {
        role: "system",
        content: buildPaniSystemPrompt({
          businessName: context.businessName,
          locale: context.locale,
          settings: context.settings,
        }),
      },
      ...context.history.map((m) => ({
        role: (m.direction === "in" ? "user" : "assistant") as "user" | "assistant",
        content: m.body.slice(0, 1500),
      })),
    ];

    const aiRes = await generateGroqReply({
      messages,
      model: context.settings.model,
      fetchImpl: input.fetchImpl,
    });
    if (!aiRes.ok) {
      if (!aiRes.skipped) {
        void reportServerError("ai.auto_reply.groq", new Error(aiRes.reason), {
          tenantId: input.tenantId,
        });
      }
      return { replied: false, reason: aiRes.reason };
    }

    const messageId = randomUUID();
    await workspaceTransaction(input.tenantId, async (db) => {
      await db.query(
        `INSERT INTO sales_messages
           (tenant_id, id, thread_id, deal_id, connection_id, provider_event_id, direction, sender, body, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'out', 'ai', $7, 'queued')`,
        [input.tenantId, messageId, input.threadId, input.dealId, input.connectionId, `ai:${messageId}`, aiRes.reply],
      );
      await db.query(
        `INSERT INTO sales_outbox (tenant_id, message_id) VALUES ($1, $2)`,
        [input.tenantId, messageId],
      );
      await db.query(
        `UPDATE sales_deals SET updated_at = now() WHERE tenant_id = $1 AND id = $2`,
        [input.tenantId, input.dealId],
      );
      await incrementAiUsage(db, input.tenantId, {
        replies: 1,
        tokensIn: aiRes.tokensIn,
        tokensOut: aiRes.tokensOut,
      });
    });

    return { replied: true, messageId, model: aiRes.model };
  } catch (err) {
    void reportServerError("ai.auto_reply", err, { tenantId: input.tenantId });
    return { replied: false, reason: "internal_error" };
  }
}

export async function simulatePaniReply(input: {
  businessName: string;
  locale: string;
  settings: Pick<WorkspaceAiSettings, "model" | "tone" | "businessContext" | "systemPrompt" | "handoffKeywords">;
  sampleMessage: string;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; reply: string; model: string; handoffTriggered: boolean; matchedKeyword?: string }
  | { ok: false; skipped?: boolean; reason: string }
> {
  const matched = matchesHandoffKeyword(input.sampleMessage, input.settings.handoffKeywords);
  if (matched) {
    return {
      ok: true,
      reply: "",
      model: input.settings.model,
      handoffTriggered: true,
      matchedKeyword: matched,
    };
  }
  const res = await generateGroqReply({
    model: input.settings.model,
    messages: [
      {
        role: "system",
        content: buildPaniSystemPrompt({
          businessName: input.businessName,
          locale: input.locale,
          settings: input.settings,
        }),
      },
      { role: "user", content: input.sampleMessage.slice(0, 1500) },
    ],
    fetchImpl: input.fetchImpl,
  });
  if (!res.ok) return res;
  return { ok: true, reply: res.reply, model: res.model, handoffTriggered: false };
}
