import {
  claimDeal,
  createMember,
  fail,
  getDeal,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const { id } = await params;
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) return fail(422, "invalid_input", { field: "id" });

    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let b: Record<string, unknown> = {};
    if (text.trim().length > 0) {
      let input: unknown;
      try {
        input = JSON.parse(text);
      } catch {
        return fail(400, "invalid_json");
      }
      if (!input || typeof input !== "object") return fail(400, "invalid_json");
      b = input as Record<string, unknown>;
    }

    const requestedMemberId = typeof b.memberId === "string" ? b.memberId.trim() : "";
    if (requestedMemberId && (requestedMemberId.length > 128 || !ID_PATTERN.test(requestedMemberId))) {
      return fail(422, "invalid_input", { field: "memberId" });
    }

    return withWorkspace(member, async (actor, db) => {
      if (actor.role === "operator" && requestedMemberId && requestedMemberId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      let targetMemberId = actor.role === "operator" ? actor.memberId : requestedMemberId || actor.memberId;
      if (!targetMemberId && actor.role === "owner") {
        await createMember(db, actor.tenantId, "owner", "Owner", "owner");
        targetMemberId = "owner";
      }
      if (!targetMemberId) return fail(422, "invalid_input", { field: "memberId" });

      const deal = await getDeal(db, actor.tenantId, id);
      if (!deal) return fail(404, "not_found");
      const result = await claimDeal(db, actor.tenantId, id, targetMemberId);
      if (result === "already-claimed") return json(409, { ok: false, error: "already_claimed" });
      if (result === "no-member") return json(403, { ok: false, error: "no_member" });
      if (result === "not-found") return fail(404, "not_found");
      const updated = await getDeal(db, actor.tenantId, id);
      return json(200, { ok: true, deal: updated });
    });
  });
