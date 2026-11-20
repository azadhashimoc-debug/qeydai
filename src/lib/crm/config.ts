import type { Channel } from "./channels";

export type ChannelConnection = { channel: Channel; account: string; tenant: string; token: string; secret?: string };

export function configuredConnections(): ChannelConnection[] {
  const value: unknown = JSON.parse(process.env.QEYDAI_CRM_CHANNELS ?? "[]");
  if (!Array.isArray(value)) throw new Error("Invalid CRM channel configuration");
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || !["telegram", "whatsapp", "instagram"].includes(entry.channel)
      || !/^[A-Za-z0-9_-]{1,128}$/.test(entry.account)
      || typeof entry.tenant !== "string" || !entry.tenant || entry.tenant.length > 64
      || typeof entry.token !== "string" || !entry.token
      || (entry.channel === "telegram" && (typeof entry.secret !== "string" || !entry.secret))) {
      throw new Error("Invalid CRM channel configuration");
    }
    const key = `${entry.channel}:${entry.account}`;
    if (seen.has(key)) throw new Error("Duplicate CRM channel account");
    seen.add(key);
  }
  return value;
}
