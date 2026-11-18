import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { normalizeAzPhone } from "../enrollment/enrollment";
import type { InboundMessage } from "./channels";

let pool: Pool | undefined;

export function setPoolForTesting(p: Pool | undefined) {
  pool = p;
}

export function databaseConfigured() {
  return Boolean(process.env.QEYDAI_DATABASE_URL);
}

export async function workspaceTransaction<T>(tenant: string, run: (db: PoolClient) => Promise<T>): Promise<T> {
  const connectionString = process.env.QEYDAI_DATABASE_URL;
  if (!connectionString) throw new Error("CRM database is not configured");
  pool ??= new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    const result = await run(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

export async function initializeWorkspace(db: PoolClient, tenant: string) {
  await db.query("INSERT INTO sales_workspaces (id, name) VALUES ($1,$1) ON CONFLICT DO NOTHING", [tenant]);
  await db.query(`
    INSERT INTO sales_stages (tenant_id,id,name,position,kind)
    VALUES ($1,'new','Yeni',0,'open'), ($1,'contacted','Əlaqə saxlanılıb',1,'open'),
           ($1,'trial_booked','Rezervasiya',2,'open'), ($1,'paid','Qazanılıb',3,'won'), ($1,'lost','İtirilib',4,'lost')
    ON CONFLICT DO NOTHING`, [tenant]);
}

export async function ingestMessage(tenant: string, message: InboundMessage): Promise<boolean> {
  const { channel, account, event, sender, name, text } = message;
  const connection = `${channel}:${account}`;
  const phone = normalizeAzPhone(sender);
  return workspaceTransaction(tenant, async (db) => {
    await initializeWorkspace(db, tenant);
    await db.query(`
      INSERT INTO sales_connections (tenant_id,id,channel,account)
      VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id,id) DO NOTHING`, [tenant, connection, channel, account]);
    const channelRow = await db.query<{ active: boolean }>(
      "SELECT active FROM sales_connections WHERE tenant_id=$1 AND id=$2", [tenant, connection],
    );
    if (!channelRow.rows[0]?.active) return false;

    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      JSON.stringify([tenant, phone ?? connection, phone ? null : sender]),
    ]);
    const seen = await db.query(
      "SELECT 1 FROM sales_messages WHERE tenant_id=$1 AND connection_id=$2 AND provider_event_id=$3",
      [tenant, connection, event],
    );
    if (seen.rowCount) return false;

    const existing = await db.query<{ id: string; contact_id: string; deal_id: string }>(`
      SELECT id, contact_id, deal_id FROM sales_threads
      WHERE tenant_id=$1 AND connection_id=$2 AND sender_id=$3`, [tenant, connection, sender]);
    const thread = existing.rows[0];

    let contactId = thread?.contact_id;
    if (!contactId && phone) {
      const byPhone = await db.query<{ id: string }>(
        "SELECT id FROM sales_contacts WHERE tenant_id=$1 AND phone=$2", [tenant, phone],
      );
      contactId = byPhone.rows[0]?.id;
    }
    if (!contactId) {
      const inserted = await db.query<{ id: string }>(`
        INSERT INTO sales_contacts (tenant_id,id,name,phone) VALUES ($1,$2,$3,$4)
        ON CONFLICT (tenant_id,phone) DO UPDATE SET phone=excluded.phone RETURNING id`,
      [tenant, randomUUID(), name, phone ?? null]);
      contactId = inserted.rows[0]?.id;
    }

    // Phone-based contact matching: flag unconfirmed matches for operator review.
    if (phone) {
      const confirmed = await db.query<{ confirmed: boolean }>(
        "SELECT confirmed FROM sales_phone_matches WHERE tenant_id=$1 AND normalized_phone=$2",
        [tenant, phone],
      );
      if (confirmed.rows.length === 0 || !confirmed.rows[0].confirmed) {
        await db.query(`
          INSERT INTO sales_phone_matches (tenant_id,id,contact_id,normalized_phone,channel,sender_id,confirmed)
          VALUES ($1,$2,$3,$4,$5,$6,false)
          ON CONFLICT (tenant_id, normalized_phone) DO UPDATE SET
            contact_id = COALESCE(sales_phone_matches.contact_id, excluded.contact_id)`,
          [tenant, randomUUID(), contactId, phone, channel, sender],
        );
      }
    }

    const open = await db.query<{ id: string }>(`
      SELECT d.id FROM sales_deals d JOIN sales_stages s ON (s.tenant_id,s.id)=(d.tenant_id,d.stage_id)
      WHERE d.tenant_id=$1 AND d.contact_id=$2 AND s.kind='open'
      ORDER BY (d.id=$3) DESC NULLS LAST, d.updated_at DESC, d.id LIMIT 1 FOR UPDATE OF d`,
    [tenant, contactId, thread?.deal_id ?? null]);
    let deal = open.rows[0]?.id;
    if (!deal) {
      deal = randomUUID();
      await db.query(`
        INSERT INTO sales_deals (tenant_id,id,contact_id,stage_id,title,source)
        VALUES ($1,$2,$3,(SELECT id FROM sales_stages WHERE tenant_id=$1 AND kind='open' ORDER BY position,id LIMIT 1),$4,$5)`,
      [tenant, deal, contactId, name, channel]);
    } else {
      await db.query("UPDATE sales_deals SET updated_at=now() WHERE tenant_id=$1 AND id=$2", [tenant, deal]);
    }

    const threadId = thread?.id ?? randomUUID();
    if (thread) {
      await db.query("UPDATE sales_threads SET deal_id=$3,last_inbound_at=now() WHERE tenant_id=$1 AND id=$2", [tenant, threadId, deal]);
    } else {
      await db.query(`
        INSERT INTO sales_threads (tenant_id,id,connection_id,contact_id,deal_id,channel,sender_id,last_inbound_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,now())`, [tenant, threadId, connection, contactId, deal, channel, sender]);
    }
    await db.query(`
      INSERT INTO sales_messages (tenant_id,id,thread_id,deal_id,connection_id,provider_event_id,direction,sender,body,status)
      VALUES ($1,$2,$3,$4,$5,$6,'in','student',$7,'received')`,
    [tenant, randomUUID(), threadId, deal, connection, event, text]);
    return true;
  });
}

