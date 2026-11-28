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
import { getMetaGraphVersion } from "@/lib/crm/delivery";
import { isPostgresConfigured } from "@/lib/crm/store";
import { hasChannelEncryptionKey } from "@/lib/crypto/secrets";
import { getSiteUrl } from "@/lib/http/site-url";

const VALID_CHANNELS = new Set<Channel>(["whatsapp", "instagram", "telegram"]);
const ACCOUNT_RE = /^[A-Za-z0-9_-]{1,128}$/;
const WHATSAPP_ACCOUNT_RE = /^\d{1,32}$/;

function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && VALID_CHANNELS.has(value as Channel);
}

async function validateWhatsAppCredentials(account: string, token: string): Promise<Response | null> {
  const unavailable = () => fail(502, "whatsapp_verification_unavailable", {
    message: "Meta hazırda WhatsApp məlumatlarını yoxlaya bilmir. Bir az sonra yenidən cəhd edin.",
  });
  try {
    const response = await fetch(
      `https://graph.facebook.com/${getMetaGraphVersion()}/${account}?fields=id,display_phone_number`,
      {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      },
    );
    const data = (await response.json().catch(() => null)) as {
      id?: string;
      display_phone_number?: string;
      error?: { code?: number; is_transient?: boolean };
    } | null;
    if (response.ok && data?.id === account && typeof data.display_phone_number === "string" &&
      data.display_phone_number.trim()) {
      return null;
    }
    if (response.status === 429 || response.status >= 500 || data?.error?.is_transient) {
      return unavailable();
    }
    if (response.status === 401 || data?.error?.code === 190 || data?.error?.code === 102) {
      return fail(422, "whatsapp_token_invalid", {
        field: "token",
        message: "Meta Access Token yanlışdır və ya vaxtı bitib. Meta-dan yeni token alın.",
      });
    }
    return fail(422, "whatsapp_account_not_accessible", {
      field: "account",
      message: "Meta bu WhatsApp Phone Number ID-ni təsdiqləmədi. ID-ni və tokenin həmin nömrəyə giriş icazəsini yoxlayın.",
    });
  } catch {
    return unavailable();
  }
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
    if (!token || token.length < 10 || token.length > 1024 || (channel === "whatsapp" && /\s/.test(token))) {
      return fail(422, "invalid_input", {
        field: "token",
        ...(channel === "whatsapp" ? { message: "Meta Access Token-i tam daxil edin." } : {}),
      });
    }

    let account = typeof b.account === "string" ? b.account.trim() : "";
    if (!account && channel === "telegram" && token.includes(":")) {
      const botId = token.split(":")[0]?.trim() ?? "";
      if (/^[0-9]{5,20}$/.test(botId)) account = botId;
    }
    if (channel === "whatsapp" ? !WHATSAPP_ACCOUNT_RE.test(account) : !ACCOUNT_RE.test(account)) {
      return fail(422, "invalid_input", {
        field: "account",
        ...(channel === "whatsapp" ? { message: "WhatsApp Phone Number ID yalnız rəqəmlərdən ibarət olmalıdır." } : {}),
      });
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
      if (isPostgresConfigured()) {
        // Serialize slot checks across requests for the same workspace.
        await db.query("SELECT id FROM sales_workspaces WHERE id = $1 FOR NO KEY UPDATE", [actor.tenantId]);
      }
      const existing = await listTenantConnections(db, actor.tenantId, base);
      const active = existing.filter((c) => c.active && c.hasToken);
      const isUpdatingSame = active.some((c) => c.id === `${channel}:${account}`);
      const limitCheck = await enforceWorkspaceLimit(db, actor.tenantId, "channels", {
        skipCountCheck: isUpdatingSame,
        channel,
        activeChannels: active.map((c) => c.channel),
      });
      if (!limitCheck.ok) {
        return fail(limitCheck.status, limitCheck.error, {
          resource: limitCheck.resource,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        });
      }
      if (channel === "whatsapp") {
        const validationError = await validateWhatsAppCredentials(account, token);
        if (validationError) return validationError;
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
