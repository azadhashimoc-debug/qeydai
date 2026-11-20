import {
  canWrite,
  confirmPhoneMatch,
  fail,
  getPanelAuthConfig,
  json,
  listDeals,
  listPhoneMatches,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const { id } = await params;
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) return fail(422, "invalid_input", { field: "id" });

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "phoneMatches")) return fail(403, "forbidden");
      const before = (await listPhoneMatches(db, actor.tenantId)).find((m) => m.id === id);
      if (!before) return fail(404, "not_found");
      if (actor.role === "operator") {
        const deals = await listDeals(db, actor.tenantId);
        const visible = deals.some(
          (d) => d.contactId === before.contactId && (d.assigneeId === null || d.assigneeId === actor.memberId),
        );
        if (!visible) return fail(403, "forbidden");
      }
      const ok = await confirmPhoneMatch(db, actor.tenantId, id);
      if (!ok) return fail(404, "not_found");
      return json(200, {
        ok: true,
        match: {
          id,
          contactId: before.contactId,
          confirmedAt: new Date().toISOString(),
        },
      });
    });
  });
