import {
  fail,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import {
  getNotificationPrefs,
  normalizeTelegramChatId,
  sanitizeChoices,
  sanitizeEmailFrequency,
  saveNotificationPrefs,
} from "@/lib/crm/notifications-store";
import { isTelegramAlertConfigured } from "@/lib/notifications/telegram";

const VALID_REMINDERS = new Set([5, 15, 30, 60]);

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const prefs = await getNotificationPrefs(db, actor.tenantId, actor.memberId || "owner");
      return json(200, {
        ok: true,
        prefs,
        telegramBotConfigured: Boolean(process.env.QEYDAI_ALERT_TELEGRAM_BOT_TOKEN?.trim()),
        defaultAlertConfigured: isTelegramAlertConfigured(),
      });
    }),
  );

export const PUT = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const text = await requireBody(req, 16 * 1024);
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

    const body = parsed as Record<string, unknown>;
    const chatId = normalizeTelegramChatId(body.telegramChatId);
    if (chatId === "invalid") {
      return fail(422, "invalid_input", { field: "telegramChatId" });
    }

    const reminderRaw = Number(body.reminderMinutes ?? 5);
    const reminderMinutes = VALID_REMINDERS.has(reminderRaw)
      ? (reminderRaw as 5 | 15 | 30 | 60)
      : 5;

    return withWorkspace(member, async (actor, db) => {
      const saved = await saveNotificationPrefs(db, actor.tenantId, actor.memberId || "owner", {
        enabled: body.enabled === true,
        telegramChatId: chatId,
        telegramEnabled: body.telegramEnabled === true && Boolean(chatId),
        emailEnabled: body.emailEnabled !== false,
        browserEnabled: body.browserEnabled === true,
        reminderMinutes,
        choices: sanitizeChoices(body.choices),
        emailFrequency: sanitizeEmailFrequency(body.emailFrequency),
      });
      return json(200, {
        ok: true,
        prefs: saved,
        telegramBotConfigured: Boolean(process.env.QEYDAI_ALERT_TELEGRAM_BOT_TOKEN?.trim()),
      });
    });
  });
