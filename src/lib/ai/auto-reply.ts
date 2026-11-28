import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getWorkspaceEntitlement, planAllowsChannel } from "../billing/entitlements";
import type { Channel } from "../crm/channels";
import { getWorkspace, isPostgresConfigured, workspaceTransaction } from "../crm/store";
import { reportServerError } from "../observability/alerts";
import { generateGroqReply, type GroqChatMessage } from "./groq";
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
  | { replied: false; reason: string; failed?: true };

type InboundReply = {
  tenantId: string;
  dealId: string;
  threadId: string;
  connectionId: string;
  inboundEventId: string;
  inboundText: string;
  fetchImpl?: typeof fetch;
};

const AI_REPLY_EVENT_PREFIX = "ai:inbound:";

function replyEventId(input: InboundReply): string {
  return AI_REPLY_EVENT_PREFIX + input.inboundEventId;
}

async function getThreadReplyState(db: PoolClient, input: InboundReply) {
  const result = await db.query<{
    latest_event_id: string | null;
    has_staff_reply: boolean;
    already_replied: boolean;
    ai_count: number;
  }>(
    `SELECT
       (SELECT m.provider_event_id FROM sales_messages m
        WHERE m.tenant_id = t.tenant_id AND m.thread_id = t.id AND m.direction = 'in'
        ORDER BY (m.created_at = t.last_inbound_at) DESC NULLS LAST, m.created_at DESC, m.id DESC
        LIMIT 1) AS latest_event_id,
       EXISTS (SELECT 1 FROM sales_messages m
               WHERE m.tenant_id = t.tenant_id AND m.thread_id = t.id AND m.sender = 'staff') AS has_staff_reply,
       EXISTS (SELECT 1 FROM sales_messages m
               WHERE m.tenant_id = t.tenant_id AND m.connection_id = t.connection_id
                 AND m.provider_event_id = $4) AS already_replied,
       (SELECT count(*)::int FROM sales_messages m
        WHERE m.tenant_id = t.tenant_id AND m.thread_id = t.id AND m.sender = 'ai'
          AND m.status <> 'canceled') AS ai_count
     FROM sales_threads t WHERE t.tenant_id = $1 AND t.id = $2 AND t.deal_id = $3`,
    [input.tenantId, input.threadId, input.dealId, replyEventId(input)],
  );
  return result.rows[0];
}

async function setThreadMode(db: PoolClient, input: InboundReply, mode: "operator" | "bot") {
  await db.query(
    `UPDATE sales_threads SET mode = $4 WHERE tenant_id = $1 AND id = $2 AND deal_id = $3`,
    [input.tenantId, input.threadId, input.dealId, mode],
  );
}

async function getReplySettings(db: PoolClient, input: InboundReply) {
  const entitlement = await getWorkspaceEntitlement(db, input.tenantId);
  if (!entitlement.canWrite) return { skip: "subscription_required" as const };

  const settings = await getWorkspaceAiSettings(db, input.tenantId);
  if (!settings.enabled) return { skip: "ai_disabled" as const };

  const connRes = await db.query<{ channel: Channel; active: boolean; automation_enabled: boolean }>(
    `SELECT channel, active, automation_enabled FROM sales_connections WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.connectionId],
  );
  const conn = connRes.rows[0];
  if (!conn?.active || !conn.automation_enabled) {
    return { skip: "connection_automation_disabled" as const };
  }
  if (!planAllowsChannel(entitlement.planCode, conn.channel)) return { skip: "channel_not_in_plan" as const };

  return {
    skip: null,
    settings,
    monthlyCap: Math.min(settings.monthlyReplyLimit, entitlement.limits.maxMonthlyAiReplies),
  };
}

function getThreadSkip(state: Awaited<ReturnType<typeof getThreadReplyState>>, input: InboundReply) {
  if (!state) return "thread_missing";
  if (state.has_staff_reply) return "operator_takeover";
  if (state.already_replied) return "already_replied";
  if (state.latest_event_id !== input.inboundEventId) return "newer_inbound";
  return null;
}

/**
 * Evaluates an inbound customer message and queues at most one reply for the current inbound event.
 */
export async function maybeAutoReplyInbound(input: InboundReply): Promise<AutoReplyOutcome> {
  if (!isPostgresConfigured()) return { replied: false, reason: "postgres_required" };

  try {
    const context = await workspaceTransaction(input.tenantId, async (db) => {
      const configuration = await getReplySettings(db, input);
      if (configuration.skip) return configuration;

      const state = await getThreadReplyState(db, input);
      const skip = getThreadSkip(state, input);
      if (skip && skip !== "newer_inbound") return { skip };

      if (matchesHandoffKeyword(input.inboundText, configuration.settings.handoffKeywords)) {
        await setThreadMode(db, input, "operator");
        return { skip: "handoff_keyword" };
      }
      if (skip) return { skip };

      const usage = await getMonthlyAiUsage(db, input.tenantId);
      if (usage.repliesCount >= configuration.monthlyCap) return { skip: "monthly_limit_reached" };
      if (state.ai_count >= configuration.settings.maxRepliesPerThread) {
        await setThreadMode(db, input, "operator");
        return { skip: "thread_cap_reached" };
      }

      const workspace = await getWorkspace(db, input.tenantId);
      const historyRes = await db.query<{ direction: string; body: string }>(
        `SELECT direction, body
         FROM (
           SELECT direction, body, created_at, id
           FROM sales_messages
           WHERE tenant_id = $1 AND thread_id = $2 AND status <> 'canceled'
           ORDER BY created_at DESC, id DESC
           LIMIT 8
         ) recent
         ORDER BY created_at ASC, id ASC`,
        [input.tenantId, input.threadId],
      );
      return {
        skip: null,
        settings: configuration.settings,
        businessName: workspace?.name || "panelim.az",
        locale: workspace?.locale || "az",
        history: historyRes.rows,
      };
    });

    if (context.skip || !context.history) {
      return { replied: false, reason: context.skip ?? "thread_missing" };
    }

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
    if (!aiRes.ok) return { replied: false, reason: aiRes.reason, failed: true };

    const messageId = randomUUID();
    const skip = await workspaceTransaction(input.tenantId, async (db) => {
      // Ingestion locks the deal before updating its thread. Match that order.
      // The workspace lock also serializes quota updates across threads.
      await db.query("SELECT id FROM sales_workspaces WHERE id = $1 FOR NO KEY UPDATE", [input.tenantId]);
      await db.query(
        "SELECT id FROM sales_deals WHERE tenant_id = $1 AND id = $2 FOR NO KEY UPDATE",
        [input.tenantId, input.dealId],
      );
      await db.query(
        "SELECT id FROM sales_threads WHERE tenant_id = $1 AND id = $2 FOR NO KEY UPDATE",
        [input.tenantId, input.threadId],
      );
      const state = await getThreadReplyState(db, input);
      const reason = getThreadSkip(state, input);
      if (reason) return reason;

      const configuration = await getReplySettings(db, input);
      if (configuration.skip) return configuration.skip;
      const usage = await getMonthlyAiUsage(db, input.tenantId);
      if (usage.repliesCount >= configuration.monthlyCap) return "monthly_limit_reached";
      if (state.ai_count >= configuration.settings.maxRepliesPerThread) return "thread_cap_reached";

      const inserted = await db.query(
        `INSERT INTO sales_messages
           (tenant_id, id, thread_id, deal_id, connection_id, provider_event_id, direction, sender, body, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'out', 'ai', $7, 'queued')
         ON CONFLICT (tenant_id, connection_id, provider_event_id) DO NOTHING
         RETURNING id`,
        [input.tenantId, messageId, input.threadId, input.dealId, input.connectionId, replyEventId(input), aiRes.reply],
      );
      if (!inserted.rows[0]) return "already_replied";

      await setThreadMode(db, input, "bot");
      await db.query("INSERT INTO sales_outbox (tenant_id, message_id) VALUES ($1, $2)", [input.tenantId, messageId]);
      await db.query(
        "UPDATE sales_deals SET updated_at = now() WHERE tenant_id = $1 AND id = $2",
        [input.tenantId, input.dealId],
      );
      await incrementAiUsage(db, input.tenantId, {
        replies: 1,
        tokensIn: aiRes.tokensIn,
        tokensOut: aiRes.tokensOut,
      });
      return null;
    });

    if (skip) return { replied: false, reason: skip };
    return { replied: true, messageId, model: aiRes.model };
  } catch (err) {
    await reportServerError("ai.auto_reply", err, { tenantId: input.tenantId });
    return { replied: false, reason: "internal_error", failed: true };
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
