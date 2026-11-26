export type TelegramSendResult =
  | { ok: true; skipped?: false }
  | { ok: false; skipped: true; reason: "not_configured" }
  | { ok: false; skipped?: false; reason: string };

export function isTelegramAlertConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    env.QEYDAI_ALERT_TELEGRAM_BOT_TOKEN?.trim() &&
      env.QEYDAI_ALERT_TELEGRAM_CHAT_ID?.trim(),
  );
}

/**
 * Sends a plain-text message via the Telegram Bot API.
 * Gracefully skips when credentials are not configured and never logs the bot token.
 */
export async function sendTelegramMessage(options: {
  text: string;
  chatId?: string;
  botToken?: string;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}): Promise<TelegramSendResult> {
  const env = options.env ?? process.env;
  const token = (options.botToken ?? env.QEYDAI_ALERT_TELEGRAM_BOT_TOKEN ?? "").trim();
  const chatId = (options.chatId ?? env.QEYDAI_ALERT_TELEGRAM_CHAT_ID ?? "").trim();
  if (!token || !chatId) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetchFn(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: options.text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.name : "network_error",
    };
  }
}

export async function notifyNewDemoLead(input: {
  tenantId: string;
  name: string;
  phone: string;
  createdAt: string;
  extraChatIds?: readonly string[];
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}): Promise<void> {
  const env = input.env ?? process.env;
  const token = (env.QEYDAI_ALERT_TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) return;

  const recipients = new Set<string>();
  const defaultChat = (env.QEYDAI_ALERT_TELEGRAM_CHAT_ID ?? "").trim();
  if (defaultChat) recipients.add(defaultChat);
  for (const id of input.extraChatIds ?? []) {
    const trimmed = id.trim();
    if (trimmed) recipients.add(trimmed);
  }
  if (recipients.size === 0) return;

  const text = [
    "[panelim.az] New demo / contact lead",
    `Workspace: ${input.tenantId}`,
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
    `Time: ${input.createdAt}`,
  ].join("\n");

  await Promise.allSettled(
    [...recipients].map((chatId) =>
      sendTelegramMessage({
        text,
        chatId,
        botToken: token,
        fetchImpl: input.fetchImpl,
        env,
      }),
    ),
  );
}
