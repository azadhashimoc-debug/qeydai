import type { Channel } from "./channels";
import type { ChannelConnection } from "./config";

export type ChannelStatus = { channel: Channel; connected: boolean; accounts: number; webhook: string };

const ORDER: Channel[] = ["whatsapp", "instagram", "telegram"];

/** Real connection state for one tenant. Never exposes tokens or secrets. */
export function channelStatuses(tenant: string, connections: ChannelConnection[], baseUrl: string): ChannelStatus[] {
  const base = baseUrl.replace(/\/+$/, "");
  return ORDER.map((channel) => {
    const mine = connections.filter((c) => c.channel === channel && c.tenant === tenant);
    const first = mine[0];
    const webhook = channel === "telegram" && first
      ? `${base}/api/channels/telegram?account=${encodeURIComponent(first.account)}`
      : `${base}/api/channels/${channel}`;
    return { channel, connected: mine.length > 0, accounts: mine.length, webhook };
  });
}
