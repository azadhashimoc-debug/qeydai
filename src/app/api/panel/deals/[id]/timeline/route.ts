import {
  fail,
  getDeal,
  getPanelAuthConfig,
  json,
  listTimeline,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const GET = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const { id: dealId } = await params;
    if (!dealId || dealId.length > 128 || !ID_PATTERN.test(dealId)) return fail(422, "invalid_input", { field: "dealId" });
    return withWorkspace(member, async (actor, db) => {
      const deal = await getDeal(db, actor.tenantId, dealId);
      if (!deal) return fail(404, "not_found");
      if (actor.role === "operator" && deal.assigneeId !== null && deal.assigneeId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      const entries = await listTimeline(db, actor.tenantId, dealId);
      const timeline = entries.map((e) =>
        "direction" in e
          ? {
              kind: "message" as const,
              id: String(e.id),
              at: e.createdAt,
              channel: "channel" in e && typeof e.channel === "string" ? e.channel : "crm",
              direction: e.direction,
              sender: e.sender,
              body: e.body,
              status: "status" in e && typeof e.status === "string" ? e.status : "received",
            }
          : {
              kind: "event" as const,
              id: String(e.id),
              at: e.createdAt,
              eventType: e.activityKind ?? "activity",
              actorId: null,
              payload: e.data ?? {},
            },
      );
      return json(200, { ok: true, entries, timeline });
    });
  });
