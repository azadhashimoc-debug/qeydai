import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { decryptSecret, encryptSecret, hasChannelEncryptionKey } from "../crypto/secrets";
import { getSharedPgPool } from "../db/pool";
import { assertSafeApplicationRole, type PgClient } from "../enrollment/postgres-store";
import type { Channel } from "./channels";
import { configuredConnections, type ChannelConnection } from "./config";
import { isPostgresConfigured, workspaceTransaction } from "./store";

export type TenantConnectionSummary = {
  id: string;
  channel: Channel;
  account: string;
  displayName: string;
  active: boolean;
  automationEnabled: boolean;
  source: "db" | "env";
  hasToken: boolean;
  webhook: string;
};

export function buildChannelWebhookUrl(baseUrl: string, channel: Channel, account?: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  if (channel === "telegram" && account) {
    return `${base}/api/channels/telegram?account=${encodeURIComponent(account)}`;
  }
  return `${base}/api/channels/${channel}`;
}

/**
 * Registers a Telegram bot webhook with Telegram Bot API so messages flow directly
 * to panelim.az without manual curl commands.
 */
export async function registerTelegramWebhook(input: {
  token: string;
  webhookUrl: string;
  secretToken: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; error?: string }> {
  const fetchFn = input.fetchImpl ?? fetch;
  try {
    const res = await fetchFn(`https://api.telegram.org/bot${input.token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: input.webhookUrl,
        secret_token: input.secretToken,
        allowed_updates: ["message"],
      }),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
    });
    if (!res.ok) return { ok: false, error: `telegram_http_${res.status}` };
    const body = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!body?.ok) return { ok: false, error: body?.description?.slice(0, 120) || "telegram_set_webhook_failed" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.name : "network_error" };
  }
}

export async function listTenantConnections(
  db: PoolClient,
  tenantId: string,
  baseUrl: string,
): Promise<TenantConnectionSummary[]> {
  const merged = new Map<string, TenantConnectionSummary>();

  // Start with legacy env-configured connections for backwards compatibility.
  for (const conn of configuredConnections()) {
    if (conn.tenant !== tenantId) continue;
    const id = `${conn.channel}:${conn.account}`;
    merged.set(id, {
      id,
      channel: conn.channel,
      account: conn.account,
      displayName: conn.account,
      active: true,
      automationEnabled: false,
      source: "env",
      hasToken: Boolean(conn.token),
      webhook: buildChannelWebhookUrl(baseUrl, conn.channel, conn.account),
    });
  }

  if (isPostgresConfigured()) {
    try {
      const res = await db.query<{
        id: string;
        channel: Channel;
        account: string;
        display_name: string;
        active: boolean;
        automation_enabled: boolean;
        token_enc: string | null;
      }>(
        `SELECT id, channel, account, display_name, active, automation_enabled, token_enc
         FROM sales_connections
         WHERE tenant_id = $1
         ORDER BY channel, id`,
        [tenantId],
      );
      for (const row of res.rows) {
        const existing = merged.get(row.id);
        merged.set(row.id, {
          id: row.id,
          channel: row.channel,
          account: row.account,
          displayName: row.display_name || row.account,
          active: Boolean(row.active),
          automationEnabled: Boolean(row.automation_enabled),
          source: !row.token_enc && row.active && existing ? "env" : "db",
          hasToken: Boolean(row.token_enc || (row.active && existing?.hasToken)),
          webhook: buildChannelWebhookUrl(baseUrl, row.channel, row.account),
        });
      }
    } catch (error) {
      // Migration 0012 not yet applied: fall back to basic columns.
      if (error && typeof error === "object" && "code" in error && error.code === "42703") {
        const res = await db.query<{
          id: string;
          channel: Channel;
          account: string;
          active: boolean;
          automation_enabled: boolean;
        }>(
          `SELECT id, channel, account, active, automation_enabled
           FROM sales_connections WHERE tenant_id = $1 ORDER BY channel, id`,
          [tenantId],
        );
        for (const row of res.rows) {
          const existing = merged.get(row.id);
          merged.set(row.id, {
            id: row.id,
            channel: row.channel,
            account: row.account,
            displayName: row.account,
            active: Boolean(row.active),
            automationEnabled: Boolean(row.automation_enabled),
            source: row.active && existing ? "env" : "db",
            hasToken: Boolean(row.active && existing?.hasToken),
            webhook: buildChannelWebhookUrl(baseUrl, row.channel, row.account),
          });
        }
      } else {
        throw error;
      }
    }
  }

  return Array.from(merged.values());
}

export async function upsertTenantConnection(
  db: PoolClient,
  tenantId: string,
  baseUrl: string,
  input: {
    channel: Channel;
    account: string;
    displayName: string;
    token: string;
    webhookSecret?: string;
    automationEnabled?: boolean;
  },
): Promise<{
  connection: TenantConnectionSummary;
  webhookSecret?: string;
}> {
  if (!hasChannelEncryptionKey()) {
    throw new Error("channel_encryption_key_missing");
  }
  const id = `${input.channel}:${input.account}`;
  const webhookSecret =
    input.webhookSecret?.trim() ||
    (input.channel === "telegram" ? randomBytes(24).toString("base64url") : undefined);
  const tokenEnc = encryptSecret(input.token);
  const secretEnc = webhookSecret ? encryptSecret(webhookSecret) : null;
  const automation = input.automationEnabled ?? true;

  await db.query(
    `INSERT INTO sales_connections
       (tenant_id, id, channel, account, display_name, active, automation_enabled, token_enc, webhook_secret_enc, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, now())
     ON CONFLICT (tenant_id, id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       active = true,
       automation_enabled = EXCLUDED.automation_enabled,
       token_enc = EXCLUDED.token_enc,
       webhook_secret_enc = COALESCE(EXCLUDED.webhook_secret_enc, sales_connections.webhook_secret_enc),
       updated_at = now()`,
    [tenantId, id, input.channel, input.account, input.displayName, automation, tokenEnc, secretEnc],
  );

  return {
    connection: {
      id,
      channel: input.channel,
      account: input.account,
      displayName: input.displayName || input.account,
      active: true,
      automationEnabled: automation,
      source: "db",
      hasToken: true,
      webhook: buildChannelWebhookUrl(baseUrl, input.channel, input.account),
    },
    webhookSecret,
  };
}

export async function updateTenantConnection(
  db: PoolClient,
  tenantId: string,
  connectionId: string,
  baseUrl: string,
  patch: {
    displayName?: string;
    active?: boolean;
    automationEnabled?: boolean;
    token?: string;
  },
): Promise<TenantConnectionSummary | null> {
  const sets: string[] = [];
  const params: unknown[] = [tenantId, connectionId];
  let idx = 3;

  if (patch.displayName !== undefined) {
    sets.push(`display_name = $${idx++}`);
    params.push(patch.displayName);
  }
  if (patch.active !== undefined) {
    sets.push(`active = $${idx++}`);
    params.push(patch.active);
  }
  if (patch.automationEnabled !== undefined) {
    sets.push(`automation_enabled = $${idx++}`);
    params.push(patch.automationEnabled);
  }
  if (patch.token !== undefined) {
    if (!hasChannelEncryptionKey()) throw new Error("channel_encryption_key_missing");
    sets.push(`token_enc = $${idx++}`);
    params.push(encryptSecret(patch.token));
  }
  if (sets.length === 0) return null;
  sets.push("updated_at = now()");

  const res = await db.query<{
    id: string;
    channel: Channel;
    account: string;
    display_name: string;
    active: boolean;
    automation_enabled: boolean;
    token_enc: string | null;
  }>(
    `UPDATE sales_connections
     SET ${sets.join(", ")}
     WHERE tenant_id = $1 AND id = $2
     RETURNING id, channel, account, display_name, active, automation_enabled, token_enc`,
    params,
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    channel: row.channel,
    account: row.account,
    displayName: row.display_name || row.account,
    active: Boolean(row.active),
    automationEnabled: Boolean(row.automation_enabled),
    source: "db",
    hasToken: Boolean(row.token_enc),
    webhook: buildChannelWebhookUrl(baseUrl, row.channel, row.account),
  };
}

export async function deleteTenantConnection(
  db: PoolClient,
  tenantId: string,
  connectionId: string,
): Promise<boolean> {
  try {
    const res = await db.query(
      "DELETE FROM sales_connections WHERE tenant_id = $1 AND id = $2",
      [tenantId, connectionId],
    );
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    // Preserve historical threads/messages if FK constraint prevents hard delete.
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      const res = await db.query(
        `UPDATE sales_connections
         SET active = false, automation_enabled = false, token_enc = NULL, webhook_secret_enc = NULL, updated_at = now()
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, connectionId],
      );
      return (res.rowCount ?? 0) > 0;
    }
    throw error;
  }
}

type StoredConnection = {
  tenant_id: string;
  channel: Channel;
  account: string;
  active: boolean;
  token_enc: string | null;
  webhook_secret_enc: string | null;
};

function resolveStoredConnection(
  row: StoredConnection | undefined,
  fromEnv: ChannelConnection | undefined,
): ChannelConnection | null {
  if (!row) return fromEnv ?? null;
  if (!row.active) return null;
  if (!row.token_enc) {
    // Legacy ingestion can create active rows without storing credentials.
    return fromEnv?.tenant === row.tenant_id ? fromEnv : null;
  }
  const token = decryptSecret(row.token_enc);
  if (!token) return null;
  return {
    channel: row.channel,
    account: row.account,
    tenant: row.tenant_id,
    token,
    secret: decryptSecret(row.webhook_secret_enc) ?? undefined,
  };
}

// Read the active flag even on databases that predate encrypted credentials.
const CONNECTION_LOOKUP_COLUMNS = `c.tenant_id, c.channel, c.account, c.active,
  to_jsonb(c)->>'token_enc' AS token_enc,
  to_jsonb(c)->>'webhook_secret_enc' AS webhook_secret_enc`;

/**
 * Resolves inbound credentials with a scoped RLS lookup.
 */
export async function resolveConnectionForWebhook(
  channel: Channel,
  account: string,
): Promise<ChannelConnection | null> {
  if (!account) return null;
  const fromEnv = configuredConnections().find(
    (item) => item.channel === channel && item.account === account,
  );
  if (!isPostgresConfigured()) return fromEnv ?? null;

  const pool = getSharedPgPool();
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db as unknown as PgClient);
    await db.query("SELECT set_config('app.channel', $1, true)", [channel]);
    await db.query("SELECT set_config('app.channel_account', $1, true)", [account]);
    const res = await db.query<StoredConnection>(
      `SELECT ${CONNECTION_LOOKUP_COLUMNS}
       FROM sales_connections c WHERE c.channel = $1 AND c.account = $2`,
      [channel, account],
    );
    let row = res.rows[0];
    if (!row && fromEnv) {
      // Older schemas can limit visibility to the legacy tenant's own rows.
      await db.query("SELECT set_config('app.tenant_id', $1, true)", [fromEnv.tenant]);
      const legacy = await db.query<StoredConnection>(
        `SELECT ${CONNECTION_LOOKUP_COLUMNS}
         FROM sales_connections c WHERE c.tenant_id = $1 AND c.channel = $2 AND c.account = $3`,
        [fromEnv.tenant, channel, account],
      );
      row = legacy.rows[0];
    }
    await db.query("COMMIT");
    return resolveStoredConnection(row, fromEnv);
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

/**
 * Resolves a channel connection for outbound message delivery inside a tenant.
 */
export async function resolveConnectionForDelivery(
  tenant: string,
  connectionId: string,
): Promise<ChannelConnection | null> {
  const fromEnv = configuredConnections().find(
    (item) => item.tenant === tenant && `${item.channel}:${item.account}` === connectionId,
  );
  if (!isPostgresConfigured()) return fromEnv ?? null;

  return workspaceTransaction(tenant, async (db) => {
    const res = await db.query<StoredConnection>(
      `SELECT ${CONNECTION_LOOKUP_COLUMNS}
       FROM sales_connections c WHERE c.tenant_id = $1 AND c.id = $2`,
      [tenant, connectionId],
    );
    return resolveStoredConnection(res.rows[0], fromEnv);
  });
}

/**
 * Discovers all tenant IDs that have either env-configured or DB-configured active channels
 * so the scheduled outbox delivery worker services every tenant.
 */
export async function listDeliveryTenants(): Promise<string[]> {
  const tenants = new Set<string>();
  for (const conn of configuredConnections()) {
    tenants.add(conn.tenant);
  }
  if (!isPostgresConfigured()) return Array.from(tenants);

  const pool = getSharedPgPool();
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db as unknown as PgClient);
    await db.query("SELECT set_config('app.worker_mode', 'deliver', true)");
    const res = await db.query<{ tenant_id: string }>(
      `SELECT DISTINCT tenant_id FROM sales_connections WHERE active = true AND token_enc IS NOT NULL`,
    );
    await db.query("COMMIT");
    for (const row of res.rows) {
      tenants.add(row.tenant_id);
    }
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    if (!(error && typeof error === "object" && "code" in error && error.code === "42703")) {
      throw error;
    }
  } finally {
    db.release();
  }
  return Array.from(tenants);
}
