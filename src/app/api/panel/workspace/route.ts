import {
  fail,
  getPanelAuthConfig,
  getWorkspace,
  json,
  requireBody,
  runPanelCRM,
  updateWorkspace,
  withWorkspace,
} from "@/lib/api/panel-crm";

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const ws = await getWorkspace(db, actor.tenantId);
      if (!ws) return fail(404, "not_found");
      return json(200, {
        ok: true,
        workspace: ws,
        actor: { memberId: actor.memberId, role: actor.role },
      });
    }),
  );

const updateHandler = (req: Request) =>
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
    const patch: { name?: string; locale?: string; timezone?: string; currency?: string } = {};
    if (b.name !== undefined) {
      const name = typeof b.name === "string" ? b.name.trim() : "";
      if (!name || name.length > 120) return fail(422, "invalid_input", { field: "name" });
      patch.name = name;
    }
    if (b.locale !== undefined) {
      if (b.locale !== "az" && b.locale !== "en") return fail(422, "invalid_input", { field: "locale" });
      patch.locale = b.locale;
    }
    if (b.timezone !== undefined) {
      if (typeof b.timezone !== "string" || !b.timezone.trim() || b.timezone.length > 64) {
        return fail(422, "invalid_input", { field: "timezone" });
      }
      patch.timezone = b.timezone.trim();
    }
    if (b.currency !== undefined) {
      if (typeof b.currency !== "string" || !b.currency.trim() || b.currency.length > 12) {
        return fail(422, "invalid_input", { field: "currency" });
      }
      patch.currency = b.currency.trim();
    }

    return withWorkspace(member, async (actor, db) => {
      if (actor.role !== "owner") return fail(403, "forbidden");
      const ws = await updateWorkspace(db, actor.tenantId, patch);
      if (!ws) return fail(404, "not_found");
      return json(200, { ok: true, workspace: ws });
    });
  });

export const PATCH = updateHandler;
export const POST = updateHandler;
