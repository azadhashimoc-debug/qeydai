import {
  fail,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { getNotificationPrefs, normalizeTelegramChatId } from "@/lib/crm/notifications-store";
import { sendTelegramMessage } from "@/lib/notifications/telegram";

export const POST = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const botToken = (process.env.QEYDAI_ALERT_TELEGRAM_BOT_TOKEN ?? "").trim();
    if (!botToken) {
      return fail(503, "telegram_alerts_not_configured");
    }

    let requestedChatId: string | null = null;
    const raw = await requireBody(req, 4096);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const normalized = normalizeTelegramChatId(parsed?.telegramChatId);
        if (normalized === "invalid") {
          return fail(422, "invalid_input", { field: "telegramChatId" });
        }
        requestedChatId = normalized;
      } catch {
        return fail(400, "invalid_json");
      }
    }

    return withWorkspace(member, async (actor, db) => {
      const prefs = await getNotificationPrefs(db, actor.tenantId, actor.memberId || "owner");
      const targetChatId = requestedChatId ?? prefs.telegramChatId;
      if (!targetChatId) {
        return fail(422, "missing_telegram_chat_id");
      }

      const result = await sendTelegramMessage({
        botToken,
        chatId: targetChatId,
        text: `[panelim.az] Test notification for workspace ${actor.tenantId}. Telegram alerts are connected.`,
      });
      if (!result.ok) {
        return fail(502, "telegram_delivery_failed");
      }
      return json(200, { ok: true, delivered: true });
    });
  });
