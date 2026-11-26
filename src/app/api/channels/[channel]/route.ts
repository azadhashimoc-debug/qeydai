import { after } from "next/server";
import { maybeAutoReplyInbound } from "@/lib/ai/auto-reply";
import { parseInbound, secretsMatch, verifyMetaSignature, type Channel } from "@/lib/crm/channels";
import { resolveConnectionForWebhook } from "@/lib/crm/connections-store";
import { deliverBatch } from "@/lib/crm/delivery";
import { databaseConfigured, ingestMessageDetailed } from "@/lib/crm/store";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { reportServerError } from "@/lib/observability/alerts";

function isChannel(value: string): value is Channel {
  return value === "telegram" || value === "whatsapp" || value === "instagram";
}

function scheduleBackground(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

export async function GET(req: Request, context: RouteContext<"/api/channels/[channel]">) {
  const { channel } = await context.params;
  if (channel !== "whatsapp" && channel !== "instagram") return new Response(null, { status: 404 });
  const params = new URL(req.url).searchParams;
  const challenge = params.get("hub.challenge");
  if (
    params.get("hub.mode") !== "subscribe" ||
    !challenge ||
    !secretsMatch(params.get("hub.verify_token") ?? "", process.env.QEYDAI_META_VERIFY_TOKEN ?? "")
  ) {
    return new Response(null, { status: 403 });
  }
  return new Response(challenge);
}

export async function POST(req: Request, context: RouteContext<"/api/channels/[channel]">) {
  const { channel } = await context.params;
  if (!isChannel(channel)) return new Response(null, { status: 404 });
  if (!databaseConfigured()) return new Response(null, { status: 503 });
  try {
    const telegramAccount =
      channel === "telegram" ? (new URL(req.url).searchParams.get("account") ?? "").trim() : "";
    const telegram =
      channel === "telegram" ? await resolveConnectionForWebhook("telegram", telegramAccount) : null;
    if (
      channel === "telegram" &&
      !secretsMatch(req.headers.get("x-telegram-bot-api-secret-token") ?? "", telegram?.secret ?? "")
    ) {
      return new Response(null, { status: 403 });
    }
    const raw = await readLimitedUtf8(req, 512 * 1024);
    if (raw === null) return new Response(null, { status: 413 });
    if (
      channel !== "telegram" &&
      !verifyMetaSignature(
        Buffer.from(raw),
        req.headers.get("x-hub-signature-256") ?? "",
        process.env.QEYDAI_META_APP_SECRET ?? "",
      )
    ) {
      return new Response(null, { status: 403 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(null, { status: 400 });
    }

    const aiTasks: Array<{
      tenantId: string;
      dealId: string;
      threadId: string;
      connectionId: string;
      inboundText: string;
    }> = [];

    for (const message of parseInbound(channel, body, telegram?.account)) {
      const connection =
        channel === "telegram"
          ? telegram
          : await resolveConnectionForWebhook(channel, message.account);
      if (!connection) continue;
      const result = await ingestMessageDetailed(connection.tenant, message);
      if (result.ingested && result.dealId && result.threadId && result.connectionId) {
        aiTasks.push({
          tenantId: connection.tenant,
          dealId: result.dealId,
          threadId: result.threadId,
          connectionId: result.connectionId,
          inboundText: message.text,
        });
      }
    }

    if (aiTasks.length > 0) {
      scheduleBackground(async () => {
        for (const task of aiTasks) {
          const outcome = await maybeAutoReplyInbound(task);
          if (outcome.replied) {
            await deliverBatch(task.tenantId, 5).catch((err) => {
              void reportServerError("api.channels.inbound.deliver", err, { tenantId: task.tenantId });
            });
          }
        }
      });
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    void reportServerError("api.channels.inbound", err, { channel });
    return new Response(null, { status: 503 });
  }
}
