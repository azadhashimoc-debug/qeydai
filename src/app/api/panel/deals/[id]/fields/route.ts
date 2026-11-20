import {
  fail,
  getDeal,
  getDealFieldValues,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  setDealFieldValues,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const GET = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const { id } = await params;
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) return fail(422, "invalid_input", { field: "id" });
    return withWorkspace(member, async (actor, db) => {
      const deal = await getDeal(db, actor.tenantId, id);
      if (!deal) return fail(404, "not_found");
      if (actor.role === "operator" && deal.assigneeId !== null && deal.assigneeId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      const values = await getDealFieldValues(db, actor.tenantId, id);
      return json(200, { ok: true, values });
    });
  });

export const PATCH = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const { id } = await params;
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
    const rawValues = b.values;
    if (!Array.isArray(rawValues)) return fail(422, "invalid_input", { field: "values" });
    const values: { fieldId: string; value: string }[] = [];
    for (const item of rawValues) {
      if (!item || typeof item !== "object") return fail(422, "invalid_input", { field: "values" });
      const rec = item as Record<string, unknown>;
      const fieldId = typeof rec.fieldId === "string" ? rec.fieldId.trim() : "";
      if (!fieldId || fieldId.length > 128 || !ID_PATTERN.test(fieldId)) return fail(422, "invalid_input", { field: "fieldId" });
      values.push({ fieldId, value: typeof rec.value === "string" ? rec.value : JSON.stringify(rec.value ?? null) });
    }
    return withWorkspace(member, async (actor, db) => {
      const deal = await getDeal(db, actor.tenantId, id);
      if (!deal) return fail(404, "not_found");
      if (actor.role === "operator" && deal.assigneeId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      await setDealFieldValues(db, actor.tenantId, id, values);
      return json(200, { ok: true, values });
    });
  });

export const PUT = PATCH;
