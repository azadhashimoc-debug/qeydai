import type { PoolClient } from "pg";
import az from "@/app/[lang]/dictionaries/az.json";
import { whatsAppReplyWindowExpired } from "@/app/[lang]/dictionaries/pani-whatsapp";
import { resolveConnectionForDelivery } from "./connections-store";
import { createTask, workspaceTransaction } from "./store";

type Delivery = {
  id: string;
  connection_id: string;
  deal_id: string;
  sender_id: string;
  body: string;
  attempts: number;
};

const DEFAULT_META_GRAPH_VERSION = "v22.0";
const MAX_ATTEMPTS = 4;

export function getMetaGraphVersion(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = (env.QEYDAI_META_GRAPH_VERSION ?? "").trim();
  return configured && /^v\d+\.\d+$/.test(configured) ? configured : DEFAULT_META_GRAPH_VERSION;
}

export async function ensureOpenOperatorTask(
  db: PoolClient,
  tenant: string,
  dealId: string,
  title: string,
  body: string,
): Promise<void> {
  const deal = await db.query(
    "SELECT id FROM sales_deals WHERE tenant_id=$1 AND id=$2 FOR NO KEY UPDATE",
    [tenant, dealId],
  );
  if (!deal.rows[0]) return;
  const existing = await db.query(
    "SELECT 1 FROM sales_tasks WHERE tenant_id=$1 AND deal_id=$2 AND title=$3 AND status='open' LIMIT 1",
    [tenant, dealId, title],
  );
  if (!existing.rows[0]) await createTask(db, tenant, dealId, title, body, null, null);
}

async function checkDeliveryLease(tenant: string, messageId: string, attempt: number) {
  return workspaceTransaction(tenant, async (db) => {
    const result = await db.query<{ last_inbound_at: Date | null; can_send: boolean }>(
      `SELECT t.last_inbound_at, (outbound.sender <> 'ai' OR (
         t.mode='bot'
         AND NOT EXISTS (
           SELECT 1 FROM sales_messages staff
           WHERE staff.tenant_id=t.tenant_id AND staff.thread_id=t.id AND staff.sender='staff'
         )
         AND (
           COALESCE(outbound.provider_event_id, '') NOT LIKE 'ai:inbound:%'
           OR outbound.provider_event_id = (
             SELECT 'ai:inbound:' || inbound.provider_event_id FROM sales_messages inbound
             WHERE inbound.tenant_id=t.tenant_id AND inbound.thread_id=t.id AND inbound.direction='in'
             ORDER BY (inbound.created_at = t.last_inbound_at) DESC NULLS LAST, inbound.created_at DESC, inbound.id DESC
             LIMIT 1
           )
         )
       )) AS can_send
       FROM sales_outbox o
       JOIN sales_messages outbound ON (outbound.tenant_id,outbound.id)=(o.tenant_id,o.message_id)
       JOIN sales_threads t ON (t.tenant_id,t.id)=(outbound.tenant_id,outbound.thread_id)
       WHERE o.tenant_id=$1 AND o.message_id=$2 AND o.attempts=$3 AND o.lease_until>now()
         AND outbound.status='queued'`,
      [tenant, messageId, attempt],
    );
    return result.rows[0];
  });
}

export async function deliverOne(tenant: string): Promise<boolean> {
  const delivery = await workspaceTransaction(tenant, async (db) => {
    // A crashed or timed-out send can already have reached the user.
    await db.query(
      `WITH expired AS (
         SELECT tenant_id, message_id FROM sales_outbox
         WHERE tenant_id=$1 AND lease_until<=now()
         FOR UPDATE SKIP LOCKED
       )
       UPDATE sales_messages m SET status='unknown' FROM expired
       WHERE (m.tenant_id,m.id)=(expired.tenant_id,expired.message_id) AND m.status='queued'`,
      [tenant],
    );
    await db.query(
      `DELETE FROM sales_outbox o
       USING sales_messages m
       WHERE o.tenant_id=$1 AND (m.tenant_id,m.id)=(o.tenant_id,o.message_id)
         AND m.status <> 'queued'`,
      [tenant],
    );
    const result = await db.query<Delivery>(
      `SELECT m.id, m.connection_id, m.deal_id, t.sender_id, m.body, o.attempts
       FROM sales_outbox o
       JOIN sales_messages m ON (m.tenant_id,m.id)=(o.tenant_id,o.message_id)
       JOIN sales_threads t ON (t.tenant_id,t.id)=(m.tenant_id,m.thread_id)
       WHERE o.tenant_id=$1 AND m.status='queued' AND o.lease_until IS NULL AND o.available_at<=now()
       ORDER BY o.available_at, o.message_id
       LIMIT 1 FOR UPDATE OF o SKIP LOCKED`,
      [tenant],
    );
    const job = result.rows[0];
    if (job) {
      await db.query(
        `UPDATE sales_outbox
         SET lease_until = now() + interval '1 minute', attempts = attempts + 1
         WHERE tenant_id=$1 AND message_id=$2`,
        [tenant, job.id],
      );
    }
    return job;
  });
  if (!delivery) return false;

  const attemptNumber = Number(delivery.attempts ?? 0) + 1;
  const connection = await resolveConnectionForDelivery(tenant, delivery.connection_id);
  const current = await checkDeliveryLease(tenant, delivery.id, attemptNumber);
  if (!current) return true;

  let status: "sent" | "failed" | "unknown" | "retry" | "canceled" = "failed";
  let lastError: string | null = null;

  if (!connection) {
    lastError = "channel_connection_missing";
  } else if (!current.can_send) {
    status = "canceled";
  } else if (
    connection.channel !== "telegram" &&
    (!current.last_inbound_at ||
      Date.now() - new Date(current.last_inbound_at).valueOf() >= 24 * 3600_000)
  ) {
    lastError = "reply_window_expired";
  } else {
    const version = getMetaGraphVersion();
    const telegram = connection.channel === "telegram";
    const whatsapp = connection.channel === "whatsapp";
    const host = whatsapp ? "graph.facebook.com" : "graph.instagram.com";
    const endpoint = telegram
      ? `https://api.telegram.org/bot${connection.token}/sendMessage`
      : `https://${host}/${version}/${connection.account}/messages`;
    const body = telegram
      ? { chat_id: delivery.sender_id, text: delivery.body }
      : whatsapp
        ? { messaging_product: "whatsapp", to: delivery.sender_id, type: "text", text: { body: delivery.body } }
        : { recipient: { id: delivery.sender_id }, message: { text: delivery.body } };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(!telegram ? { authorization: `Bearer ${connection.token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
        redirect: "error",
      });
      if (response.ok) {
        status = "sent";
      } else if (response.status === 429 && attemptNumber < MAX_ATTEMPTS) {
        status = "retry";
        lastError = `http_${response.status}`;
      } else {
        status = response.status >= 500 ? "unknown" : "failed";
        lastError = `http_${response.status}`;
        if (whatsapp && response.status === 400) {
          const data = (await response.json().catch(() => null)) as { error?: { code?: number } } | null;
          if (data?.error?.code === 131047) lastError = "reply_window_expired";
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.name : "network_error";
      // A timeout or disconnection can happen after the provider accepts the message.
      status = "unknown";
    }
  }

  await workspaceTransaction(tenant, async (db) => {
    const lease = await db.query(
      `SELECT 1 FROM sales_outbox
       WHERE tenant_id=$1 AND message_id=$2 AND attempts=$3 AND lease_until IS NOT NULL
       FOR UPDATE`,
      [tenant, delivery.id, attemptNumber],
    );
    if (!lease.rows[0]) return;

    if (status === "retry") {
      const delaySec = Math.min(300, 30 * attemptNumber);
      await db.query(
        `UPDATE sales_outbox
         SET lease_until = NULL,
             available_at = now() + ($3 * interval '1 second'),
             last_error = $4
         WHERE tenant_id=$1 AND message_id=$2`,
        [tenant, delivery.id, delaySec, lastError],
      );
      return;
    }

    const updated = await db.query(
      "UPDATE sales_messages SET status=$3 WHERE tenant_id=$1 AND id=$2 AND status='queued'",
      [tenant, delivery.id, status],
    );
    await db.query(
      "DELETE FROM sales_outbox WHERE tenant_id=$1 AND message_id=$2",
      [tenant, delivery.id],
    );
    if (updated.rowCount && lastError === "reply_window_expired") {
      await ensureOpenOperatorTask(
        db,
        tenant,
        delivery.deal_id,
        connection?.channel === "whatsapp" ? whatsAppReplyWindowExpired : az.panel.deals.replyWindowExpired,
        "",
      );
    }
  });

  return true;
}

/**
 * Processes up to `maxMessages` queued outbound messages for a tenant in one invocation.
 */
export async function deliverBatch(tenant: string, maxMessages = 20): Promise<number> {
  const cap = Math.max(1, Math.min(100, maxMessages));
  let processed = 0;
  for (let i = 0; i < cap; i += 1) {
    const didWork = await deliverOne(tenant);
    if (!didWork) break;
    processed += 1;
  }
  return processed;
}
