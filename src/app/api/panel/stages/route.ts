import {
  canWrite,
  fail,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { createStage, deleteStage, listStages, updateStage } from "@/lib/crm/store";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const stages = await listStages(db, actor.tenantId);
      return json(200, { ok: true, stages });
    }),
  );

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
    if (!name || name.length > 80) return fail(422, "invalid_input", { field: "name" });

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "stages")) return fail(403, "forbidden");
      const stage = await createStage(db, actor.tenantId, name);
      if (!stage) return fail(500, "server_error");
      return json(201, { ok: true, stage });
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
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 80) return fail(422, "invalid_input", { field: "name" });

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "stages")) return fail(403, "forbidden");
      const ok = await updateStage(db, actor.tenantId, id, name);
      if (!ok) return fail(404, "not_found");
      const all = await listStages(db, actor.tenantId);
      const stage = all.find((s) => s.id === id) ?? { id, name, position: 0, kind: "open" as const };
      return json(200, { ok: true, stage });
    });
  });

export const DELETE = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) {
      return Promise.resolve(fail(422, "invalid_input", { field: "id" }));
    }
    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "stages")) return fail(403, "forbidden");
      const ok = await deleteStage(db, actor.tenantId, id);
      if (!ok) {
        const existing = await listStages(db, actor.tenantId);
        if (existing.some((s) => s.id === id)) return fail(409, "stage_in_use");
        return fail(404, "not_found");
      }
      return json(200, { ok: true });
    });
  });
