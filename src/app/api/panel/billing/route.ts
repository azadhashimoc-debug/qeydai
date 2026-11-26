import {
  getLatestBillingEvent,
  getPanelAuthConfig,
  json,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const subscription = await getLatestBillingEvent(db, actor.tenantId);
      return json(200, { ok: true, subscription });
    }),
  );
