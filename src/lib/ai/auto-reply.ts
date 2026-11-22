import { randomUUID } from "node:crypto";
import type { InboundMessage } from "@/lib/crm/channels";
import { deliverOne } from "@/lib/crm/delivery";
import { workspaceTransaction } from "@/lib/crm/store";
import { chatComplete, configuredProviders } from "./llm";
import { getAiSettings } from "./settings";
import { buildMessages, isGrounded, looksSensitive, parseModelReply, type HistoryItem } from "./prompt";

const STAFF_QUIET_MINUTES = 30;
const MAX_AI_REPLIES_PER_HOUR = 10;
const HISTORY_LIMIT = 8;

/** Per-tenant business knowledge: QEYDAI_AI_KNOWLEDGE='{"<tenant>":"services, prices, hours..."}'. */
export function tenantKnowledge(tenant: string, env: Record<string, string | undefined> = process.env): string | null {
  try {
    const value: unknown = JSON.parse(env.QEYDAI_AI_KNOWLEDGE ?? "{}");
    const text = typeof value === "object" && value !== null ? (value as Record<string, unknown>)[tenant] : undefined;
    return typeof text === "string" && text.trim() ? text.trim().slice(0, 12000) : null;
  } catch {
    return null;
  }
}

type Snapshot = { knowledge: string; threadId: string; dealId: string; connectionId: string; lastId: string; history: HistoryItem[]; businessName: string };

/** Drafts and queues an AI reply for a freshly stored inbound message. Best effort: never throws. */
export async function autoReply(tenant: string, message: InboundMessage): Promise<void> {
  try {
    if (!process.env.QEYDAI_DATABASE_URL) return; // PostgreSQL path only
    if (configuredProviders().length === 0) return;

    const connectionId = `${message.channel}:${message.account}`;
    const snapshot = await workspaceTransaction(tenant, async (db): Promise<Snapshot | null> => {
      const settings = await getAiSettings(db, tenant);
      if (!settings.enabled || !settings.knowledge) return null;
      const thread = await db.query<{ id: string; deal_id: string }>(
        "SELECT id, deal_id FROM sales_threads WHERE tenant_id=$1 AND connection_id=$2 AND sender_id=$3",
        [tenant, connectionId, message.sender],
      );
      const row = thread.rows[0];
      if (!row) return null;
      const recent = await db.query<{ id: string; direction: "in" | "out"; sender: string; body: string; created_at: Date }>(
        `SELECT id, direction, sender, body, created_at FROM sales_messages
         WHERE tenant_id=$1 AND thread_id=$2 ORDER BY created_at DESC, id DESC LIMIT $3`,
        [tenant, row.id, HISTORY_LIMIT],
      );
      const latest = recent.rows[0];
      if (!latest || latest.direction !== "in") return null;
      const now = Date.now();
      const humanActive = recent.rows.some(
        (item) => item.sender === "staff" && now - new Date(item.created_at).getTime() < STAFF_QUIET_MINUTES * 60_000,
      );
      const aiRecent = recent.rows.filter(
        (item) => item.sender === "ai" && now - new Date(item.created_at).getTime() < 3_600_000,
      ).length;
      if (humanActive || aiRecent >= MAX_AI_REPLIES_PER_HOUR) return null;
      const workspace = await db.query<{ name: string }>("SELECT name FROM sales_workspaces WHERE id=$1", [tenant]);
      return {
        knowledge: settings.knowledge,
        threadId: row.id,
        dealId: row.deal_id,
        connectionId,
        lastId: latest.id,
        history: recent.rows.reverse().map((item) => ({ direction: item.direction, body: item.body })),
        businessName: workspace.rows[0]?.name ?? "the business",
      };
    });
    if (!snapshot) return;

    // Payment-card data or credentials must never leave for a model provider: hand off to staff instead.
    const sensitive = snapshot.history.some((item) => item.direction === "in" && looksSensitive(item.body));

    let parsed: { reply: string; handoff: boolean };
    if (sensitive) {
      parsed = { reply: "", handoff: true };
    } else {
      // The model call happens outside any database transaction.
      const result = await chatComplete(buildMessages(snapshot.businessName, snapshot.knowledge, snapshot.history));
      if (!result) return;
      parsed = parseModelReply(result.text);
      if (!parsed.handoff && !isGrounded(parsed.reply, snapshot.knowledge, snapshot.history)) {
        parsed = { reply: "", handoff: true }; // the reply states a number that is not in the business information
      }
    }
    if (parsed.handoff) {
      // Left for staff: open a task on the deal so it is not missed. One per customer message.
      await workspaceTransaction(tenant, async (db) => {
        await db.query(
          `INSERT INTO sales_tasks (tenant_id,id,deal_id,title,body)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id,id) DO NOTHING`,
          [tenant, `ai-handoff:${snapshot.lastId}`, snapshot.dealId, "AI handoff: reply to this customer", "The AI was not confident enough to answer. See the latest inbound message."],
        );
      });
      return;
    }

    await workspaceTransaction(tenant, async (db) => {
      await db.query("SELECT 1 FROM sales_threads WHERE tenant_id=$1 AND id=$2 FOR UPDATE", [tenant, snapshot.threadId]);
      const latest = await db.query<{ id: string }>(
        "SELECT id FROM sales_messages WHERE tenant_id=$1 AND thread_id=$2 ORDER BY created_at DESC, id DESC LIMIT 1",
        [tenant, snapshot.threadId],
      );
      if (latest.rows[0]?.id !== snapshot.lastId) return; // customer or staff wrote meanwhile
      const id = randomUUID();
      await db.query(
        `INSERT INTO sales_messages (tenant_id,id,thread_id,deal_id,connection_id,provider_event_id,direction,sender,body,status)
         VALUES ($1,$2,$3,$4,$5,$6,'out','ai',$7,'queued')`,
        [tenant, id, snapshot.threadId, snapshot.dealId, snapshot.connectionId, `out:${id}`, parsed.reply],
      );
      await db.query("INSERT INTO sales_outbox (tenant_id,message_id) VALUES ($1,$2)", [tenant, id]);
    });
    await deliverOne(tenant).catch(() => {}); // the cron worker retries if this fails
  } catch {
    console.warn("ai: auto reply skipped");
  }
}
