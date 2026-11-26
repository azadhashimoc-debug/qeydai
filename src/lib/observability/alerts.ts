import { sendTelegramMessage } from "../notifications/telegram";

const PER_CONTEXT_COOLDOWN_MS = 60_000;
const HOURLY_CAP = 20;
const HOUR_MS = 3_600_000;

const lastSentByContext = new Map<string, number>();
let hourlyWindowStart = 0;
let hourlyCount = 0;

export function resetAlertThrottleForTests(): void {
  lastSentByContext.clear();
  hourlyWindowStart = 0;
  hourlyCount = 0;
}

function allowAlertDispatch(context: string, nowMs: number): boolean {
  if (nowMs - hourlyWindowStart >= HOUR_MS) {
    hourlyWindowStart = nowMs;
    hourlyCount = 0;
  }
  if (hourlyCount >= HOURLY_CAP) return false;
  const prev = lastSentByContext.get(context);
  if (prev !== undefined && nowMs - prev < PER_CONTEXT_COOLDOWN_MS) return false;
  lastSentByContext.set(context, nowMs);
  hourlyCount += 1;
  return true;
}

function safeErrorSummary(err: unknown): { name: string; message: string } {
  if (err instanceof Error) {
    return {
      name: err.name || "Error",
      message: err.message.slice(0, 300),
    };
  }
  return { name: "UnknownError", message: typeof err === "string" ? err.slice(0, 300) : "unknown" };
}

/**
 * Logs a structured server error and forwards a rate-limited operational alert to
 * Telegram (QEYDAI_ALERT_TELEGRAM_*) and/or an optional webhook (QEYDAI_ERROR_WEBHOOK_URL).
 * Never throws and never includes raw request bodies or secrets.
 */
export function reportServerError(
  context: string,
  err: unknown,
  extra?: Record<string, string | number | boolean | undefined>,
  options?: { fetchImpl?: typeof fetch; env?: Record<string, string | undefined>; nowMs?: number },
): Promise<void> {
  const env = options?.env ?? process.env;
  const nowMs = options?.nowMs ?? Date.now();
  const summary = safeErrorSummary(err);
  const cleanExtra: Record<string, string | number | boolean> = {};
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) cleanExtra[k] = v;
    }
  }

  console.error(
    JSON.stringify({
      level: "error",
      ts: new Date(nowMs).toISOString(),
      context,
      error: summary.name,
      message: summary.message,
      ...cleanExtra,
    }),
  );

  if (!allowAlertDispatch(context, nowMs)) {
    return Promise.resolve();
  }

  const tasks: Promise<unknown>[] = [];
  const alertLines = [
    `[panelim.az] Server error: ${context}`,
    `${summary.name}: ${summary.message}`,
    ...Object.entries(cleanExtra).map(([k, v]) => `${k}: ${String(v)}`),
    `Time: ${new Date(nowMs).toISOString()}`,
  ];

  if (env.QEYDAI_ALERT_TELEGRAM_BOT_TOKEN?.trim() && env.QEYDAI_ALERT_TELEGRAM_CHAT_ID?.trim()) {
    tasks.push(
      sendTelegramMessage({
        text: alertLines.join("\n"),
        fetchImpl: options?.fetchImpl,
        env,
      }),
    );
  }

  const webhookUrl = env.QEYDAI_ERROR_WEBHOOK_URL?.trim();
  if (webhookUrl && webhookUrl.startsWith("https://")) {
    const fetchFn = options?.fetchImpl ?? fetch;
    tasks.push(
      fetchFn(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service: "panelim.az",
          context,
          error: summary.name,
          message: summary.message,
          extra: cleanExtra,
          ts: new Date(nowMs).toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      }).catch(() => undefined),
    );
  }

  return Promise.allSettled(tasks).then(() => undefined);
}
