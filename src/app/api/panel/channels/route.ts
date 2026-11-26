import {
  fail,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { enforceWorkspaceLimit } from "@/lib/billing/entitlements";
import type { Channel } from "@/lib/crm/channels";
import { buildChannelWebhookUrl, listTenantConnections, registerTelegramWebhook, upsertTenantConnection } from "@/lib/crm/connections-store";
import { hasChannelEncryptionKey } from "@/lib/crypto/secrets";
import { getSiteUrl } from "@/lib/http/site-url";

const VALID_CHANNELS = new Set<Channel>(["whatsapp", "instagram", "telegram"]);
const ACCOUNT_RE = /^[A-Za-z0-9_-]{1,128}$/;

function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && VALID_CHANNELS.has(value as Channel);
}

function summarizeByChannel(
  connections: Awaited<ReturnType<typeof listTenantConnections>>,
  baseUrl: string,
) {
  const order: Channel[] = ["whatsapp", "instagram", "telegram"];
  return order.map((channel) => {
    const active = connections.filter((c) => c.channel === channel && c.active && c.hasToken);
    const first = active[0] ?? connections.find((c) => c.channel === channel);
    return {
      channel,
      connected: active.length > 0,
      accounts: active.length,
      webhook: buildChannelWebhookUrl(baseUrl, channel, first?.account),
    };
  });
}

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const base = getSiteUrl() || new URL(req.url).origin;
      const connections = await listTenantConnections(db, actor.tenantId, base);
      return json(200, {
        ok: true,
        channels: summarizeByChannel(connections, base),
        connections,
        encryptionReady: hasChannelEncryptionKey(),
        metaVerifyConfigured: Boolean((process.env.QEYDAI_META_VERIFY_TOKEN ?? "").trim()),
      });
    }),
  );

export const POST = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail(400, "invalid_json");
    }
    const b = parsed as Record<string, unknown>;
    if (!isChannel(b.channel)) return fail(422, "invalid_input", { field: "channel" });
    const channel = b.channel;
    const token = typeof b.token === "string" ? b.token.trim() : "";
    if (!token || token.length < 10 || token.length > 1024) {
      return fail(422, "invalid_input", { field: "token" });
    }

    let account = typeof b.account === "string" ? b.account.trim() : "";
    if (!account && channel === "telegram" && token.includes(":")) {
      const botId = token.split(":")[0]?.trim() ?? "";
      if (/^[0-9]{5,20}$/.test(botId)) account = botId;
    }
    if (!ACCOUNT_RE.test(account)) {
      return fail(422, "invalid_input", { field: "account" });
    }

    const displayName =
      typeof b.displayName === "string" && b.displayName.trim()
        ? b.displayName.trim().slice(0, 120)
        : account;
    const webhookSecret =
      typeof b.webhookSecret === "string" && b.webhookSecret.trim()
        ? b.webhookSecret.trim().slice(0, 256)
        : undefined;
    const automationEnabled =
      typeof b.automationEnabled === "boolean" ? b.automationEnabled : true;
    const shouldRegisterTelegram =
      channel === "telegram" && b.registerWebhook !== false;

    if (!hasChannelEncryptionKey()) {
      return fail(503, "channel_encryption_not_configured");
    }

    return withWorkspace(member, async (actor, db) => {
      if (actor.role !== "owner" && actor.role !== "manager") {
        return fail(403, "forbidden");
      }
      const base = getSiteUrl() || new URL(req.url).origin;
      const existing = await listTenantConnections(db, actor.tenantId, base);
      const isUpdatingSame = existing.some((c) => c.id === `${channel}:${account}` && c.active);
      const limitCheck = await enforceWorkspaceLimit(db, actor.tenantId, "channels", {
        skipCountCheck: isUpdatingSame,
      });
      if (!limitCheck.ok) {
        return fail(limitCheck.status, limitCheck.error, {
          resource: limitCheck.resource,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        });
      }
      try {
        const saved = await upsertTenantConnection(db, actor.tenantId, base, {
          channel,
          account,
          displayName,
          token,
          webhookSecret,
          automationEnabled,
        });

        let webhookRegistered: boolean | undefined;
        let webhookError: string | undefined;
        if (shouldRegisterTelegram && saved.webhookSecret) {
          const reg = await registerTelegramWebhook({
            token,
            webhookUrl: saved.connection.webhook,
            secretToken: saved.webhookSecret,
          });
          webhookRegistered = reg.ok;
          webhookError = reg.error;
        }

        const connections = await listTenantConnections(db, actor.tenantId, base);
        return json(201, {
          ok: true,
          connection: saved.connection,
          channels: summarizeByChannel(connections, base),
          connections,
          ...(webhookRegistered !== undefined ? { webhookRegistered } : {}),
          ...(webhookError ? { webhookError } : {}),
        });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "23505") {
          return fail(409, "channel_account_already_connected");
        }
        throw error;
      }
    });
  });
