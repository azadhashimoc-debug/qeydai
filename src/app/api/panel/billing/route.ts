import {
  getLatestBillingEvent,
  getPanelAuthConfig,
  json,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { getWorkspaceEntitlement } from "@/lib/billing/entitlements";

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const [subscription, entitlement] = await Promise.all([
        getLatestBillingEvent(db, actor.tenantId),
        getWorkspaceEntitlement(db, actor.tenantId),
      ]);
      const checkoutConfigured = Boolean(
        (process.env.QEYDAI_PAYCELL_WEBHOOK_SECRET ?? "").trim() &&
          (process.env.QEYDAI_PAYCELL_CHECKOUT_URL ?? "").trim(),
      );
      return json(200, { ok: true, subscription, entitlement, checkoutConfigured });
    }),
  );
