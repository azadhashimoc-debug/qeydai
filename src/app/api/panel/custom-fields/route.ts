import {
  canWrite,
  createFieldDef,
  deleteFieldDef,
  fail,
  getDeal,
  getDealFieldValues,
  getPanelAuthConfig,
  json,
  listFieldDefs,
  requireBody,
  runPanelCRM,
  updateFieldDef,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
type FieldKind = "text" | "number" | "date" | "boolean";

function parseFieldKind(raw: unknown): FieldKind | null {
  if (raw === undefined) return "text";
  if (raw === "text" || raw === "number" || raw === "date" || raw === "boolean") return raw;
  return null;
}

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
        const values = await getDealFieldValues(db, actor.tenantId, dealId);
        return json(200, { ok: true, values });
      }
      const defs = await listFieldDefs(db, actor.tenantId);
      return json(200, { ok: true, defs });
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
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 100) return fail(422, "invalid_input", { field: "name" });
    const kind = parseFieldKind(b.kind);
    if (!kind) return fail(422, "invalid_input", { field: "kind" });
    const required = typeof b.required === "boolean" ? b.required : false;

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "customFields")) return fail(403, "forbidden");
      const def = await createFieldDef(db, actor.tenantId, name, kind, required);
      if (!def) return fail(500, "server_error");
      return json(201, { ok: true, def });
    });
  });

export const PATCH = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) return fail(422, "invalid_input", { field: "id" });
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
    const patch: { name?: string; required?: boolean; position?: number } = {};
    if (b.name !== undefined) {
      const name = typeof b.name === "string" ? b.name.trim() : "";
      if (!name || name.length > 100) return fail(422, "invalid_input", { field: "name" });
      patch.name = name;
    }
    if (b.required !== undefined) patch.required = Boolean(b.required);
    if (b.position !== undefined) {
      if (typeof b.position !== "number" || !Number.isInteger(b.position) || b.position < 0) {
        return fail(422, "invalid_input", { field: "position" });
      }
      patch.position = b.position;
    }

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "customFields")) return fail(403, "forbidden");
      const def = await updateFieldDef(db, actor.tenantId, id, patch);
      if (!def) return fail(404, "not_found");
      return json(200, { ok: true, def });
    });
  });

export const DELETE = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) {
      return Promise.resolve(fail(422, "invalid_input", { field: "id" }));
    }
    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "customFields")) return fail(403, "forbidden");
      const ok = await deleteFieldDef(db, actor.tenantId, id);
      if (!ok) return fail(404, "not_found");
      return json(200, { ok: true });
    });
  });
