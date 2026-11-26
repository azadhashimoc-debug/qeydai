import { describe, expect, it } from "vitest";
import { channelStatuses } from "./channel-status";

const conns = [
  { channel: "telegram" as const, account: "bot1", tenant: "t1", token: "SECRET-TOKEN", secret: "S" },
  { channel: "whatsapp" as const, account: "wa1", tenant: "t2", token: "x" },
];

describe("channelStatuses", () => {
  it("reports only the tenant's own connections", () => {
    const s = channelStatuses("t1", conns, "https://panelim.az/");
    expect(s.map((x) => [x.channel, x.connected])).toEqual([["whatsapp", false], ["instagram", false], ["telegram", true]]);
  });
  it("builds webhook urls and never leaks tokens", () => {
    const s = channelStatuses("t1", conns, "https://panelim.az/");
    expect(s[2].webhook).toBe("https://panelim.az/api/channels/telegram?account=bot1");
    expect(s[0].webhook).toBe("https://panelim.az/api/channels/whatsapp");
    expect(JSON.stringify(s)).not.toContain("SECRET");
  });
});
