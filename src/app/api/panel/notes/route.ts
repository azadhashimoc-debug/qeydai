import {
  createNote,
  deleteNote,
  fail,
  getDeal,
  getPanelAuthConfig,
  json,
  listDeals,
  listNotes,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) => {
    const dealId = new URL(req.url).searchParams.get("dealId") ?? "";
    if (dealId && (dealId.length > 128 || !ID_PATTERN.test(dealId))) {
      return Promise.resolve(fail(422, "invalid_input", { field: "dealId" }));
    }
    return withWorkspace(member, async (actor, db) => {
      if (dealId) {
        const deal = await getDeal(db, actor.tenantId, dealId);
        if (!deal) return fail(404, "not_found");
        if (actor.role === "operator" && deal.assigneeId !== null && deal.assigneeId !== actor.memberId) {
          return fail(403, "forbidden");
        }
        const notes = await listNotes(db, actor.tenantId, dealId);
        return json(200, { ok: true, notes });
      }
      const notes = await listNotes(db, actor.tenantId);
      if (actor.role !== "operator") return json(200, { ok: true, notes });
      const deals = await listDeals(db, actor.tenantId);
      const visibleDealIds = new Set(
        deals.filter((d) => d.assigneeId === null || d.assigneeId === actor.memberId).map((d) => d.id),
      );
      return json(200, { ok: true, notes: notes.filter((n) => visibleDealIds.has(n.dealId)) });
    });
  });

export const POST = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
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
    const dealId = typeof b.dealId === "string" ? b.dealId.trim() : "";
    if (!dealId || dealId.length > 128 || !ID_PATTERN.test(dealId)) return fail(422, "invalid_input", { field: "dealId" });
    const body = typeof b.body === "string" ? b.body : "";
    if (!body.trim() || body.length > 10000) return fail(422, "invalid_input", { field: "body" });

    return withWorkspace(member, async (actor, db) => {
      const deal = await getDeal(db, actor.tenantId, dealId);
      if (!deal) return fail(404, "not_found");
      if (actor.role === "operator" && deal.assigneeId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      const note = await createNote(db, actor.tenantId, dealId, body.trim(), actor.memberId || null);
      if (!note) return fail(500, "server_error");
      return json(201, { ok: true, note });
    });
  });

export const DELETE = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) {
      return Promise.resolve(fail(422, "invalid_input", { field: "id" }));
    }
    return withWorkspace(member, async (actor, db) => {
      if (actor.role === "operator") {
        const all = await listNotes(db, actor.tenantId);
        const target = all.find((n) => n.id === id);
        if (!target) return fail(404, "not_found");
        const deal = await getDeal(db, actor.tenantId, target.dealId);
        if (!deal || deal.assigneeId !== actor.memberId) return fail(403, "forbidden");
      }
      const ok = await deleteNote(db, actor.tenantId, id);
      if (!ok) return fail(404, "not_found");
      return json(200, { ok: true });
    });
  });
