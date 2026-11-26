import { randomUUID } from "node:crypto";
import {
  claimDeal,
  createDeal,
  deleteDeal,
  fail,
  getDeal,
  getPanelAuthConfig,
  json,
  listDeals,
  requireBody,
  runPanelCRM,
  updateDeal,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { enforceWorkspaceLimit } from "@/lib/billing/entitlements";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const deals = await listDeals(db, actor.tenantId);
      const visible =
        actor.role === "operator"
          ? deals.filter((d) => d.assigneeId === null || d.assigneeId === actor.memberId)
          : deals;
      return json(200, { ok: true, deals: visible });
    }),
  );

export const PATCH = (req: Request) =>
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
    const queryId = new URL(req.url).searchParams.get("id") ?? "";
    const id = typeof b.id === "string" && b.id.trim() ? b.id.trim() : queryId.trim();
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) return fail(422, "invalid_input", { field: "id" });

    const patch: { stageId?: string; title?: string; note?: string; amountMinor?: number; assigneeId?: string | null } = {};
    if (b.stageId !== undefined) {
      if (typeof b.stageId !== "string" || !ID_PATTERN.test(b.stageId)) return fail(422, "invalid_input", { field: "stageId" });
      patch.stageId = b.stageId;
    }
    if (b.title !== undefined) {
      const title = typeof b.title === "string" ? b.title.trim() : "";
      if (!title || title.length > 120) return fail(422, "invalid_input", { field: "title" });
      patch.title = title;
    }
    if (b.note !== undefined) {
      if (typeof b.note !== "string" || b.note.length > 10000) return fail(422, "invalid_input", { field: "note" });
      patch.note = b.note.trim();
    }
    if (b.amountMinor !== undefined) {
      const amt = typeof b.amountMinor === "number" ? b.amountMinor : NaN;
      if (!Number.isInteger(amt) || amt < 0 || amt > 999999999999) return fail(422, "invalid_input", { field: "amountMinor" });
      patch.amountMinor = amt;
    }
    if (b.assigneeId !== undefined) {
      if (b.assigneeId === null || b.assigneeId === "") patch.assigneeId = null;
      else if (typeof b.assigneeId === "string" && ID_PATTERN.test(b.assigneeId)) patch.assigneeId = b.assigneeId;
      else return fail(422, "invalid_input", { field: "assigneeId" });
    }

    return withWorkspace(member, async (actor, db) => {
      const existing = await getDeal(db, actor.tenantId, id);
      if (!existing) return fail(404, "not_found");
      if (actor.role === "operator") {
        if (existing.assigneeId !== actor.memberId) return fail(403, "forbidden");
        if (patch.assigneeId !== undefined && patch.assigneeId !== actor.memberId) return fail(403, "forbidden");
      }
      const deal = await updateDeal(db, actor.tenantId, id, patch);
      if (!deal) return fail(404, "not_found");
      return json(200, { ok: true, deal });
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
    const rawId = typeof b.id === "string" ? b.id.trim() : "";
    const id = rawId || randomUUID();
    if (id.length > 128 || !ID_PATTERN.test(id)) return fail(422, "invalid_input", { field: "id" });
    const contactId = typeof b.contactId === "string" ? b.contactId.trim() : "";
    if (!contactId || contactId.length > 128 || !ID_PATTERN.test(contactId)) return fail(422, "invalid_input", { field: "contactId" });
    const stageId = typeof b.stageId === "string" && b.stageId.trim() ? b.stageId.trim() : "new";
    if (stageId.length > 128 || !ID_PATTERN.test(stageId)) return fail(422, "invalid_input", { field: "stageId" });
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title || title.length > 120) return fail(422, "invalid_input", { field: "title" });
    const source = typeof b.source === "string" ? b.source : "manual";
    if (!["telegram", "whatsapp", "instagram", "web", "manual"].includes(source)) return fail(422, "invalid_input", { field: "source" });
    let amountMinor = 0;
    if (b.amountMinor !== undefined) {
      const amt = typeof b.amountMinor === "number" ? b.amountMinor : NaN;
      if (!Number.isInteger(amt) || amt < 0 || amt > 999999999999) return fail(422, "invalid_input", { field: "amountMinor" });
      amountMinor = amt;
    }
    let note = "";
    if (b.note !== undefined) {
      if (typeof b.note !== "string" || b.note.length > 10000) return fail(422, "invalid_input", { field: "note" });
      note = b.note.trim();
    }

    return withWorkspace(member, async (actor, db) => {
      const limitCheck = await enforceWorkspaceLimit(db, actor.tenantId, "deals");
      if (!limitCheck.ok) {
        return fail(limitCheck.status, limitCheck.error, {
          resource: limitCheck.resource,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        });
      }
      const deal = await createDeal(db, actor.tenantId, id, contactId, stageId, title, source, amountMinor, note);
      if (!deal) return fail(409, "deal_exists");
      if (actor.role === "operator" && actor.memberId) {
        await claimDeal(db, actor.tenantId, deal.id, actor.memberId);
        const claimed = await getDeal(db, actor.tenantId, deal.id);
        return json(201, { ok: true, deal: claimed ?? deal });
      }
      return json(201, { ok: true, deal });
    });
  });

export const DELETE = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) return Promise.resolve(fail(422, "invalid_input", { field: "id" }));
    return withWorkspace(member, async (actor, db) => {
      const existing = await getDeal(db, actor.tenantId, id);
      if (!existing) return fail(404, "not_found");
      if (actor.role === "operator" && existing.assigneeId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      const ok = await deleteDeal(db, actor.tenantId, id);
      if (!ok) return fail(404, "not_found");
      return json(200, { ok: true });
    });
  });
