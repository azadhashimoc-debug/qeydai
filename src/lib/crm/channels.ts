import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type Channel = "telegram" | "whatsapp" | "instagram";

export type InboundMessage = {
  channel: Channel;
  account: string;
  event: string;
  sender: string;
  name: string;
  text: string;
};

export function secretsMatch(value: string, expected: string): boolean {
  const hash = (text: string) => createHash("sha256").update(text).digest();
  return Boolean(expected) && timingSafeEqual(hash(value), hash(expected));
}

export function verifyMetaSignature(body: Buffer, signature: string, secret: string): boolean {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function identifier(value: unknown): string {
  if (typeof value === "string" && value.length <= 256) return value;
  return typeof value === "number" && Number.isSafeInteger(value) ? String(value) : "";
}

function makeMessage(channel: Channel, account: unknown, event: unknown, sender: unknown, name: unknown, body: unknown): InboundMessage[] {
  const text = typeof body === "string" ? body.trim() : "";
  const data = { channel, account: identifier(account), event: identifier(event), sender: identifier(sender) };
  if (!data.account || !data.event || !data.sender || !text || text.length > 10000) return [];
  return [{ ...data, name: typeof name === "string" ? name.trim().slice(0, 120) || data.sender : data.sender, text }];
}

export function parseInbound(channel: Channel, payload: unknown, telegramAccount = ""): InboundMessage[] {
  const root = record(payload);
  if (channel === "telegram") {
    const message = record(root.message);
    const chat = record(message.chat);
    const from = record(message.from);
    if (chat.type !== "private" || from.is_bot === true) return [];
    return makeMessage(channel, telegramAccount, root.update_id, chat.id, from.first_name, message.text);
  }
  if (channel === "instagram") {
    return list(root.entry).flatMap((entry) => list(entry.messaging).flatMap((item) => {
      const message = record(item.message);
      if (message.is_echo === true || message.is_deleted === true) return [];
      return makeMessage(channel, entry.id, message.mid, record(item.sender).id, undefined, message.text);
    }));
  }
  return list(root.entry).flatMap((entry) => list(entry.changes).flatMap((change) => {
    const value = record(change.value);
    const account = record(value.metadata).phone_number_id;
    return list(value.messages).flatMap((message) => {
      const contact = list(value.contacts).find((item) => item.wa_id === message.from);
      return makeMessage(channel, account, message.id, message.from, record(contact?.profile).name, record(message.text).body);
    });
  }));
}
