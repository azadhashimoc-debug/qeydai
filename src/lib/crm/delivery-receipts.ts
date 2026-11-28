import type { PoolClient } from "pg";
import { workspaceTransaction } from "./store";

export type WhatsAppReceipt = {
  account: string;
  id: string;
  recipient: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
};

const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const list = (v: unknown): Record<string, unknown>[] => Array.isArray(v) ? v.map(object) : [];

export function parseWhatsAppReceipts(payload: unknown): WhatsAppReceipt[] {
  return list(object(payload).entry).flatMap(entry => list(entry.changes).flatMap(change => {
    const value = object(change.value);
    const account = object(value.metadata).phone_number_id;
    if (change.field !== "messages" || value.messaging_product !== "whatsapp" ||
        typeof account !== "string" || !/^\d{1,32}$/.test(account)) return [];
    return list(value.statuses).flatMap(item => {
      if (typeof item.id !== "string" || !item.id || item.id.length > 256 ||
          typeof item.recipient_id !== "string" || !/^\d{5,20}$/.test(item.recipient_id) ||
          !["sent", "delivered", "read", "failed"].includes(String(item.status)) ||
          typeof item.timestamp !== "string" || !/^\d{1,12}$/.test(item.timestamp)) return [];
      return [{ account, id: item.id, recipient: item.recipient_id,
        status: item.status as WhatsAppReceipt["status"], timestamp: Number(item.timestamp) }];
    });
  }));
}

export async function saveWhatsAppReceipt(
  db: PoolClient, tenant: string, connection: string, receipt: WhatsAppReceipt, messageId?: string,
): Promise<string> {
  // Rolling deployments can reach an older schema before migration 0016.
  // Provider acceptance must still commit; live verification requires the table.
  await db.query("SAVEPOINT sp_delivery_receipt");
  try {
    const result = await db.query<{ status: string; message_id: string | null }>(
      `INSERT INTO sales_delivery_receipts
         (tenant_id,connection_id,provider_message_id,message_id,recipient_id,status,provider_timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id,connection_id,provider_message_id) DO UPDATE SET
         message_id=COALESCE(sales_delivery_receipts.message_id,EXCLUDED.message_id),
         status=CASE
           WHEN sales_delivery_receipts.status='read' OR EXCLUDED.status='read' THEN 'read'
           WHEN sales_delivery_receipts.status='delivered' OR EXCLUDED.status='delivered' THEN 'delivered'
           WHEN sales_delivery_receipts.status='failed' OR EXCLUDED.status='failed' THEN 'failed'
           ELSE 'sent' END,
         provider_timestamp=GREATEST(sales_delivery_receipts.provider_timestamp,EXCLUDED.provider_timestamp),
         updated_at=now()
       WHERE sales_delivery_receipts.recipient_id=EXCLUDED.recipient_id
       RETURNING status,message_id`,
      [tenant, connection, receipt.id, messageId ?? null, receipt.recipient, receipt.status, receipt.timestamp],
    );
    const row = result.rows[0];
    if (!row) throw new Error("receipt_recipient_mismatch");
    if (row.message_id) {
      const status = row.status === "read" ? "delivered" : row.status;
      await db.query(
        `UPDATE sales_messages SET status=$3 WHERE tenant_id=$1 AND id=$2 AND direction='out'
         AND connection_id=$4 AND status IN ('queued','sent','unknown','failed','delivered')`,
        [tenant, row.message_id, status, connection],
      );
    }
    await db.query("RELEASE SAVEPOINT sp_delivery_receipt");
    return row.status;
  } catch (error) {
    await db.query("ROLLBACK TO SAVEPOINT sp_delivery_receipt");
    await db.query("RELEASE SAVEPOINT sp_delivery_receipt");
    if (error && typeof error === "object" && "code" in error && error.code === "42P01") return "sent";
    throw error;
  }
}

export async function recordWhatsAppReceipt(tenant: string, connection: string, receipt: WhatsAppReceipt) {
  return workspaceTransaction(tenant, db => saveWhatsAppReceipt(db, tenant, connection, receipt));
}
