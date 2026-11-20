import {
  fail,
  getDeal,
  getPanelAuthConfig,
  json,
  listDealMessages,
  requireBody,
  runPanelCRM,
  sendDealReply,
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
      const messages = await listDealMessages(db, actor.tenantId, dealId);
      return json(200, { ok: true, messages });
    });
  });

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const { id: dealId } = await params;
    if (!dealId || dealId.length > 128 || !ID_PATTERN.test(dealId)) return fail(422, "invalid_input", { field: "dealId" });
    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!input || typeof input !== "object") return fail(400, "invalid_json");
    const b = input as Record<string, unknown>;
    const body = typeof b.body === "string" ? b.body.trim() : "";
    if (!body || body.length > 4000) return fail(422, "invalid_input", { field: "body" });

    return withWorkspace(member, async (actor, db) => {
      const deal = await getDeal(db, actor.tenantId, dealId);
      if (!deal) return fail(404, "not_found");
      if (actor.role === "operator" && deal.assigneeId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      const res = await sendDealReply(db, actor.tenantId, dealId, body);
      if (!res.ok) {
        if (res.error === "reply_window_expired") return fail(403, "reply_window_expired");
        return fail(404, res.error === "no_thread" ? "no_thread" : "not_found");
      }
      return json(201, {
        ok: true,
        message: res.message,
      });
    });
  });
