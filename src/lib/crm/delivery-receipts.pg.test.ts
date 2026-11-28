import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { ingestMessageDetailed, initializeWorkspace, workspaceTransaction } from "./store";
import { saveWhatsAppReceipt, type WhatsAppReceipt } from "./delivery-receipts";
import { closeSharedPgPool } from "../db/pool";
import { cleanup, findOwnedTenant } from "../../../scripts/verify-live.mjs";
import { deliverOne } from "./delivery";
import { upsertTenantConnection } from "./connections-store";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const identities = [0, 1].map(() => ({ email: `live-${randomUUID()}@example.test`, name: `Live QA ${randomUUID()}`, tenant: `biz_${randomUUID()}` }));
let pool: Pool;
let deal = "", thread = "", connection = "", message = "";
const receipt: WhatsAppReceipt = { account: String(Date.now()), id: "wamid." + randomUUID(), recipient: "994505551234", timestamp: 100, status: "delivered" };

suite("live delivery evidence and safe cleanup with forced PostgreSQL RLS", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL });
    for (const identity of identities) await workspaceTransaction(identity.tenant, async db => {
      await initializeWorkspace(db, identity.tenant);
      await db.query('UPDATE sales_workspaces SET name=$2 WHERE id=$1', [identity.tenant, identity.name]);
      await db.query('INSERT INTO panel_accounts(tenant_id,id,email,password_hash) VALUES($1,$2,$3,$4)',
        [identity.tenant, randomUUID(), identity.email, 'test-fixture-not-used-for-login'.padEnd(64, '-')]);
    });
    const ingested = await ingestMessageDetailed(identities[0].tenant, { channel: "whatsapp", account: receipt.account,
      event: "live-" + randomUUID(), sender: receipt.recipient, name: "QA", text: "Salam" });
    deal = ingested.dealId!; thread = ingested.threadId!; connection = ingested.connectionId!;
    message = randomUUID();
    await workspaceTransaction(identities[0].tenant, async db => {
      await db.query(`INSERT INTO sales_messages(tenant_id,id,thread_id,deal_id,connection_id,provider_event_id,direction,sender,body,status)
        VALUES($1,$2,$3,$4,$5,$6,'out','ai','Salam','queued')`, [identities[0].tenant, message, thread, deal, connection, 'ai:inbound:test']);
    });
  });
  afterAll(async () => {
    if (pool) { await cleanup(pool, { identities }); await pool.end(); }
    await closeSharedPgPool();
  });
  it("handles a genuine status arriving before the send response, without losing dedupe IDs", async () => {
    await workspaceTransaction(identities[0].tenant, async db => {
      expect(await saveWhatsAppReceipt(db, identities[0].tenant, connection, receipt)).toBe('delivered');
      expect(await saveWhatsAppReceipt(db, identities[0].tenant, connection, { ...receipt, timestamp: 0, status: 'sent' }, message)).toBe('delivered');
      const row = (await db.query('SELECT status,provider_event_id FROM sales_messages WHERE tenant_id=$1 AND id=$2', [identities[0].tenant, message])).rows[0];
      expect(row).toEqual({ status: 'delivered', provider_event_id: 'ai:inbound:test' });
    });
  });
  it("does not downgrade read/delivered on out-of-order callbacks or duplicate sends", async () => {
    await workspaceTransaction(identities[0].tenant, async db => {
      for (const status of ['read', 'sent', 'failed', 'delivered'] as const) {
        expect(await saveWhatsAppReceipt(db, identities[0].tenant, connection, { ...receipt, status })).toBe('read');
      }
      const rows = await db.query('SELECT status FROM sales_delivery_receipts WHERE tenant_id=$1', [identities[0].tenant]);
      expect(rows.rows).toEqual([{ status: 'read' }]);
    });
  });
  it("rejects recipient mismatch and prevents cross-tenant receipt visibility", async () => {
    await expect(workspaceTransaction(identities[0].tenant, db => saveWhatsAppReceipt(db, identities[0].tenant, connection,
      { ...receipt, recipient: '994505559999' }))).rejects.toThrow('receipt_recipient_mismatch');
    await workspaceTransaction(identities[1].tenant, async db => {
      expect((await db.query('SELECT * FROM sales_delivery_receipts')).rowCount).toBe(0);
      expect((await db.query('UPDATE sales_delivery_receipts SET status=$1 WHERE tenant_id=$2', ['failed', identities[0].tenant])).rowCount).toBe(0);
    });
  });
  it("commits genuine provider acceptance without overwriting an early delivered webhook", async () => {
    vi.stubEnv('QEYDAI_CHANNELS_ENCRYPTION_KEY', 'local-receipt-test-encryption-key-12345678');
    const outbound = randomUUID();
    const providerId = 'wamid.' + randomUUID();
    try {
      await workspaceTransaction(identities[0].tenant, async db => {
        await upsertTenantConnection(db, identities[0].tenant, 'https://example.test', {
          channel: 'whatsapp', account: receipt.account, displayName: 'QA', token: 'local-test-token',
        });
        await db.query(`INSERT INTO sales_messages(tenant_id,id,thread_id,deal_id,connection_id,direction,sender,body,status)
          VALUES($1,$2,$3,$4,$5,'out','staff','Local test','queued')`, [identities[0].tenant, outbound, thread, deal, connection]);
        await db.query('INSERT INTO sales_outbox(tenant_id,message_id) VALUES($1,$2)', [identities[0].tenant, outbound]);
      });
      vi.stubGlobal('fetch', vi.fn(async () => {
        await workspaceTransaction(identities[0].tenant, db => saveWhatsAppReceipt(db, identities[0].tenant, connection,
          { ...receipt, id: providerId, status: 'delivered' }));
        return new Response(JSON.stringify({ messages: [{ id: providerId }] }), { status: 200 });
      }));
      expect(await deliverOne(identities[0].tenant)).toBe(true);
      await workspaceTransaction(identities[0].tenant, async db => {
        expect((await db.query('SELECT status FROM sales_messages WHERE tenant_id=$1 AND id=$2', [identities[0].tenant, outbound])).rows[0].status).toBe('delivered');
        expect((await db.query('SELECT 1 FROM sales_outbox WHERE tenant_id=$1', [identities[0].tenant])).rowCount).toBe(0);
      });
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
  it("keeps the transaction usable when rolling onto a schema before migration 0016", async () => {
    await workspaceTransaction(identities[0].tenant, async db => {
      await db.query('SET LOCAL search_path=pg_catalog');
      expect(await saveWhatsAppReceipt(db, identities[0].tenant, connection, receipt)).toBe('sent');
      expect((await db.query('SELECT 1 AS ok')).rows[0].ok).toBe(1);
    });
  });
  it("refuses another business name, then cleans only its own account and all its dependent rows", async () => {
    await expect(cleanup(pool, { identities: [{ ...identities[0], name: 'Wrong owner' }] })).rejects.toThrow('sahibi');
    await cleanup(pool, { identities: [identities[0]] });
    expect(await findOwnedTenant(pool, identities[0])).toBeNull();
    expect(await findOwnedTenant(pool, identities[1])).toBe(identities[1].tenant);
    // Repeated cleanup is safe, including recovery after a prior successful deletion.
    await cleanup(pool, { identities: [identities[0]] });
  });
});
