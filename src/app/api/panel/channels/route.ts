import { channelStatuses } from "@/lib/crm/channel-status";
import { configuredConnections } from "@/lib/crm/config";
import { getPanelAuthConfig, json, runPanelCRM } from "@/lib/api/panel-crm";

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
    return json(200, { ok: true, channels: channelStatuses(member.tenantId, configuredConnections(), base) });
  });
