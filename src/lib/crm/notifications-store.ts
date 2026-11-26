import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { isPostgresConfigured, workspaceTransaction } from "./store";

export type NotificationPrefs = {
  enabled: boolean;
  telegramChatId: string | null;
  telegramEnabled: boolean;
  emailEnabled: boolean;
  browserEnabled: boolean;
  reminderMinutes: 5 | 15 | 30 | 60;
  choices: Record<string, boolean>;
  emailFrequency: Record<string, "immediate" | "daily" | "unread-hourly" | "unread-quarter-hour">;
  updatedAt: string | null;
};

const VALID_REMINDERS = new Set([5, 15, 30, 60]);
const VALID_FREQUENCIES = new Set(["immediate", "daily", "unread-hourly", "unread-quarter-hour"]);
const CHAT_ID_RE = /^-?\d{5,20}$/;

export function defaultNotificationPrefs(): NotificationPrefs {
  return {
    enabled: false,
    telegramChatId: null,
    telegramEnabled: false,
    emailEnabled: true,
    browserEnabled: false,
    reminderMinutes: 5,
    choices: {},
    emailFrequency: {},
    updatedAt: null,
  };
}

export function normalizeTelegramChatId(raw: unknown): string | null | "invalid" {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return "invalid";
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return CHAT_ID_RE.test(trimmed) ? trimmed : "invalid";
}

function parseJsonObject(val: unknown): Record<string, unknown> {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as Record<string, unknown>;
  if (typeof val === "string") {
    try {
      const parsed: unknown = JSON.parse(val);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function sanitizeChoices(raw: unknown): Record<string, boolean> {
  const obj = parseJsonObject(raw);
  const out: Record<string, boolean> = {};
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (count >= 120) break;
    if (typeof v === "boolean" && k.length > 0 && k.length <= 64) {
      out[k] = v;
      count++;
    }
  }
  return out;
}

export function sanitizeEmailFrequency(
  raw: unknown,
): Record<string, "immediate" | "daily" | "unread-hourly" | "unread-quarter-hour"> {
  const obj = parseJsonObject(raw);
  const out: Record<string, "immediate" | "daily" | "unread-hourly" | "unread-quarter-hour"> = {};
  let count = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (count >= 60) break;
    if (typeof v === "string" && VALID_FREQUENCIES.has(v) && k.length > 0 && k.length <= 64) {
      out[k] = v as "immediate" | "daily" | "unread-hourly" | "unread-quarter-hour";
      count++;
    }
  }
  return out;
}

async function ensureSqliteTable(db: PoolClient): Promise<void> {
  if (isPostgresConfigured()) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS sales_notification_prefs (
      tenant_id text NOT NULL,
      member_id text NOT NULL,
      enabled integer NOT NULL DEFAULT 0,
      telegram_chat_id text,
      telegram_enabled integer NOT NULL DEFAULT 0,
      email_enabled integer NOT NULL DEFAULT 1,
      browser_enabled integer NOT NULL DEFAULT 0,
      reminder_minutes integer NOT NULL DEFAULT 5,
      choices text NOT NULL DEFAULT '{}',
      email_frequency text NOT NULL DEFAULT '{}',
      updated_at text NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (tenant_id, member_id)
    )
  `);
}

function rowToPrefs(row: Record<string, unknown>): NotificationPrefs {
  const reminderNum = Number(row.reminder_minutes ?? 5);
  return {
    enabled: Boolean(row.enabled),
    telegramChatId: typeof row.telegram_chat_id === "string" && row.telegram_chat_id ? row.telegram_chat_id : null,
    telegramEnabled: Boolean(row.telegram_enabled),
    emailEnabled: row.email_enabled === undefined ? true : Boolean(row.email_enabled),
    browserEnabled: Boolean(row.browser_enabled),
    reminderMinutes: VALID_REMINDERS.has(reminderNum) ? (reminderNum as 5 | 15 | 30 | 60) : 5,
    choices: sanitizeChoices(row.choices),
    emailFrequency: sanitizeEmailFrequency(row.email_frequency),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function getNotificationPrefs(
  db: PoolClient,
  tenantId: string,
  memberId: string,
): Promise<NotificationPrefs> {
  const scopeMember = memberId || "owner";
  try {
    await ensureSqliteTable(db);
    const res = await db.query<Record<string, unknown>>(
      `SELECT enabled, telegram_chat_id, telegram_enabled, email_enabled, browser_enabled,
              reminder_minutes, choices, email_frequency, updated_at
       FROM sales_notification_prefs
       WHERE tenant_id = $1 AND member_id = $2`,
      [tenantId, scopeMember],
    );
    if (!res.rows[0]) return defaultNotificationPrefs();
    return rowToPrefs(res.rows[0]);
  } catch {
    return defaultNotificationPrefs();
  }
}

export async function saveNotificationPrefs(
  db: PoolClient,
  tenantId: string,
  memberId: string,
  input: Omit<NotificationPrefs, "updatedAt">,
): Promise<NotificationPrefs> {
  const scopeMember = memberId || "owner";
  const nowIso = new Date().toISOString();
  await ensureSqliteTable(db);

  if (isPostgresConfigured()) {
    const res = await db.query<Record<string, unknown>>(
      `INSERT INTO sales_notification_prefs (
         tenant_id, member_id, enabled, telegram_chat_id, telegram_enabled,
         email_enabled, browser_enabled, reminder_minutes, choices, email_frequency, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, now())
       ON CONFLICT (tenant_id, member_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         telegram_chat_id = EXCLUDED.telegram_chat_id,
         telegram_enabled = EXCLUDED.telegram_enabled,
         email_enabled = EXCLUDED.email_enabled,
         browser_enabled = EXCLUDED.browser_enabled,
         reminder_minutes = EXCLUDED.reminder_minutes,
         choices = EXCLUDED.choices,
         email_frequency = EXCLUDED.email_frequency,
         updated_at = now()
       RETURNING enabled, telegram_chat_id, telegram_enabled, email_enabled, browser_enabled,
                 reminder_minutes, choices, email_frequency, updated_at`,
      [
        tenantId,
        scopeMember,
        input.enabled,
        input.telegramChatId,
        input.telegramEnabled,
        input.emailEnabled,
        input.browserEnabled,
        input.reminderMinutes,
        JSON.stringify(input.choices),
        JSON.stringify(input.emailFrequency),
      ],
    );
    return rowToPrefs(res.rows[0] ?? {});
  }

  await db.query(
    `INSERT INTO sales_notification_prefs (
       tenant_id, member_id, enabled, telegram_chat_id, telegram_enabled,
       email_enabled, browser_enabled, reminder_minutes, choices, email_frequency, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (tenant_id, member_id) DO UPDATE SET
       enabled = excluded.enabled,
       telegram_chat_id = excluded.telegram_chat_id,
       telegram_enabled = excluded.telegram_enabled,
       email_enabled = excluded.email_enabled,
       browser_enabled = excluded.browser_enabled,
       reminder_minutes = excluded.reminder_minutes,
       choices = excluded.choices,
       email_frequency = excluded.email_frequency,
       updated_at = excluded.updated_at`,
    [
      tenantId,
      scopeMember,
      input.enabled ? 1 : 0,
      input.telegramChatId,
      input.telegramEnabled ? 1 : 0,
      input.emailEnabled ? 1 : 0,
      input.browserEnabled ? 1 : 0,
      input.reminderMinutes,
      JSON.stringify(input.choices),
      JSON.stringify(input.emailFrequency),
      nowIso,
    ],
  );
  return { ...input, updatedAt: nowIso };
}

/**
 * Returns Telegram chat IDs of workspace members who opted into Telegram notifications.
 */
export async function listWorkspaceTelegramChatIds(tenantId: string): Promise<string[]> {
  try {
    return await workspaceTransaction(tenantId, async (db) => {
      await ensureSqliteTable(db);
      const res = await db.query<{ telegram_chat_id: string | null }>(
        isPostgresConfigured()
          ? `SELECT telegram_chat_id FROM sales_notification_prefs
             WHERE tenant_id = $1 AND enabled = true AND telegram_enabled = true
               AND telegram_chat_id IS NOT NULL`
          : `SELECT telegram_chat_id FROM sales_notification_prefs
             WHERE tenant_id = $1 AND enabled = 1 AND telegram_enabled = 1
               AND telegram_chat_id IS NOT NULL`,
        [tenantId],
      );
      return res.rows
        .map((r) => r.telegram_chat_id?.trim() ?? "")
        .filter(Boolean);
    });
  } catch {
    return [];
  }
}

/**
 * Mirrors an inbound public web demo/contact lead into the target workspace's
 * sales_contacts + sales_deals tables so it immediately appears on the Deals/Kanban board.
 * No-ops gracefully if the target workspace has not been provisioned in sales_workspaces yet.
 */
export async function syncPublicLeadToWorkspaceDeal(input: {
  tenantId: string;
  name: string;
  phone: string;
  nowIso: string;
}): Promise<{ synced: boolean; dealId?: string }> {
  if (!isPostgresConfigured()) return { synced: false };
  try {
    return await workspaceTransaction(input.tenantId, async (db) => {
      const ws = await db.query<{ id: string }>(
        "SELECT id FROM sales_workspaces WHERE id = $1",
        [input.tenantId],
      );
      if (ws.rows.length === 0) return { synced: false };

      const stageRes = await db.query<{ id: string }>(
        "SELECT id FROM sales_stages WHERE tenant_id = $1 ORDER BY position ASC LIMIT 1",
        [input.tenantId],
      );
      const stageId = stageRes.rows[0]?.id;
      if (!stageId) return { synced: false };

      const existingContact = await db.query<{ id: string }>(
        "SELECT id FROM sales_contacts WHERE tenant_id = $1 AND phone = $2 LIMIT 1",
        [input.tenantId, input.phone],
      );
      let contactId = existingContact.rows[0]?.id;
      if (!contactId) {
        contactId = `ct_${randomUUID()}`;
        await db.query(
          `INSERT INTO sales_contacts (tenant_id, id, name, phone, phone_verified, created_at)
           VALUES ($1, $2, $3, $4, false, $5)
           ON CONFLICT (tenant_id, phone) DO NOTHING`,
          [input.tenantId, contactId, input.name.slice(0, 120), input.phone, input.nowIso],
        );
        const recheck = await db.query<{ id: string }>(
          "SELECT id FROM sales_contacts WHERE tenant_id = $1 AND phone = $2 LIMIT 1",
          [input.tenantId, input.phone],
        );
        contactId = recheck.rows[0]?.id ?? contactId;
      }

      const dealId = `deal_${randomUUID()}`;
      await db.query(
        `INSERT INTO sales_deals (tenant_id, id, contact_id, stage_id, title, source, note, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'web', $6, $7, $7)`,
        [
          input.tenantId,
          dealId,
          contactId,
          stageId,
          input.name.slice(0, 120),
          "Website demo / contact inquiry",
          input.nowIso,
        ],
      );
      return { synced: true, dealId };
    });
  } catch {
    return { synced: false };
  }
}
