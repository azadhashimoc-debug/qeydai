import { configuredConnections } from "./config";
import { workspaceTransaction } from "./store";

type Delivery = { id: string; connection_id: string; sender_id: string; body: string; last_inbound_at: Date | null };

export async function deliverOne(tenant: string): Promise<boolean> {
  const delivery = await workspaceTransaction(tenant, async (db) => {
    // A crashed or timed-out send can already have reached the user.
    await db.query(`
      UPDATE sales_messages m SET status='unknown' FROM sales_outbox o
      WHERE o.tenant_id=$1 AND (m.tenant_id,m.id)=(o.tenant_id,o.message_id)
        AND m.status='queued' AND o.lease_until<now()`, [tenant]);
    const result = await db.query<Delivery>(`
      SELECT m.id,m.connection_id,t.sender_id,m.body,t.last_inbound_at
      FROM sales_outbox o JOIN sales_messages m ON (m.tenant_id,m.id)=(o.tenant_id,o.message_id)
      JOIN sales_threads t ON (t.tenant_id,t.id)=(m.tenant_id,m.thread_id)
      WHERE o.tenant_id=$1 AND m.status='queued' AND o.lease_until IS NULL AND o.available_at<=now()
      ORDER BY o.available_at,o.message_id LIMIT 1 FOR UPDATE OF o SKIP LOCKED`, [tenant]);
    const job = result.rows[0];
    if (job) await db.query(`
      UPDATE sales_outbox SET lease_until=now()+interval '1 minute',attempts=attempts+1
      WHERE tenant_id=$1 AND message_id=$2`, [tenant, job.id]);
    return job;
  });
  if (!delivery) return false;
  const connection = configuredConnections().find(
    (item) => item.tenant === tenant && `${item.channel}:${item.account}` === delivery.connection_id,
  );
  let status = "failed";
  if (connection && (connection.channel === "telegram" || (
    delivery.last_inbound_at && Date.now() - new Date(delivery.last_inbound_at).valueOf() < 24 * 3600_000
  ))) {
    const version = process.env.QEYDAI_META_GRAPH_VERSION;
    const telegram = connection.channel === "telegram";
    const whatsapp = connection.channel === "whatsapp";
    const host = whatsapp ? "graph.facebook.com" : "graph.instagram.com";
    if (telegram || (version && /^v\d+\.\d+$/.test(version))) {
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
          signal: AbortSignal.timeout(12000),
          redirect: "error",
        });
        status = response.ok ? "sent" : response.status >= 500 ? "unknown" : "failed";
      } catch {
        status = "unknown";
      }
    }
  }
  await workspaceTransaction(tenant, (db) => db.query(
    "UPDATE sales_messages SET status=$3 WHERE tenant_id=$1 AND id=$2 AND status='queued'", [tenant, delivery.id, status],
  ));
  return true;
}
