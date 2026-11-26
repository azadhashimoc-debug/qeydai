import { parseInbound, secretsMatch, verifyMetaSignature, type Channel } from "@/lib/crm/channels";
import { configuredConnections } from "@/lib/crm/config";
import { databaseConfigured, ingestMessage } from "@/lib/crm/store";
import { readLimitedUtf8 } from "@/lib/http/read-body";
import { reportServerError } from "@/lib/observability/alerts";

function isChannel(value: string): value is Channel {
  return value === "telegram" || value === "whatsapp" || value === "instagram";
}

export async function GET(req: Request, context: RouteContext<"/api/channels/[channel]">) {
  const { channel } = await context.params;
  if (channel !== "whatsapp" && channel !== "instagram") return new Response(null, { status: 404 });
  const params = new URL(req.url).searchParams;
  const challenge = params.get("hub.challenge");
  if (params.get("hub.mode") !== "subscribe" || !challenge
      || !secretsMatch(params.get("hub.verify_token") ?? "", process.env.QEYDAI_META_VERIFY_TOKEN ?? "")) {
    return new Response(null, { status: 403 });
  }
  return new Response(challenge);
}

export async function POST(req: Request, context: RouteContext<"/api/channels/[channel]">) {
  const { channel } = await context.params;
  if (!isChannel(channel)) return new Response(null, { status: 404 });
  if (!databaseConfigured()) return new Response(null, { status: 503 });
  try {
    const connections = configuredConnections().filter((item) => item.channel === channel);
    const telegram = channel === "telegram"
      ? connections.find((item) => item.account === new URL(req.url).searchParams.get("account"))
      : undefined;
    if (channel === "telegram" && !secretsMatch(req.headers.get("x-telegram-bot-api-secret-token") ?? "", telegram?.secret ?? "")) {
      return new Response(null, { status: 403 });
    }
    const raw = await readLimitedUtf8(req, 512 * 1024);
    if (raw === null) return new Response(null, { status: 413 });
    if (channel !== "telegram" && !verifyMetaSignature(
      Buffer.from(raw), req.headers.get("x-hub-signature-256") ?? "", process.env.QEYDAI_META_APP_SECRET ?? "",
    )) return new Response(null, { status: 403 });
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(null, { status: 400 });
    }
    for (const message of parseInbound(channel, body, telegram?.account)) {
      const connection = connections.find((item) => item.account === message.account);
      if (connection) await ingestMessage(connection.tenant, message);
    }
    return new Response(null, { status: 200 });
  } catch (err) {
    void reportServerError("api.channels.inbound", err, { channel });
    return new Response(null, { status: 503 });
  }
}
