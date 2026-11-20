import {
  createTask,
  deleteTask,
  fail,
  getDeal,
  getPanelAuthConfig,
  json,
  listDeals,
  listTasks,
  requireBody,
  runPanelCRM,
  updateTask,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
type TaskStatus = "open" | "done" | "canceled";

function parseTaskStatus(raw: unknown): TaskStatus | null {
  if (raw === "open" || raw === "done" || raw === "canceled") return raw;
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
        const tasks = await listTasks(db, actor.tenantId, dealId);
        return json(200, { ok: true, tasks });
      }
      const tasks = await listTasks(db, actor.tenantId);
      if (actor.role !== "operator") return json(200, { ok: true, tasks });
      const deals = await listDeals(db, actor.tenantId);
      const visibleDealIds = new Set(
        deals.filter((d) => d.assigneeId === null || d.assigneeId === actor.memberId).map((d) => d.id),
      );
      return json(200, { ok: true, tasks: tasks.filter((t) => visibleDealIds.has(t.dealId)) });
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
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title || title.length > 200) return fail(422, "invalid_input", { field: "title" });
    const body = typeof b.body === "string" ? b.body : "";
    if (body.length > 10000) return fail(422, "invalid_input", { field: "body" });
    let assigneeId: string | null = null;
    if (b.assigneeId !== undefined) {
      if (b.assigneeId === null || b.assigneeId === "") assigneeId = null;
      else if (typeof b.assigneeId === "string" && b.assigneeId.trim() && ID_PATTERN.test(b.assigneeId)) assigneeId = b.assigneeId.trim();
      else return fail(422, "invalid_input", { field: "assigneeId" });
    }
    const dueAt = typeof b.dueAt === "string" ? b.dueAt : null;

    return withWorkspace(member, async (actor, db) => {
      const deal = await getDeal(db, actor.tenantId, dealId);
      if (!deal) return fail(404, "not_found");
      if (actor.role === "operator" && deal.assigneeId !== actor.memberId) {
        return fail(403, "forbidden");
      }
      const task = await createTask(db, actor.tenantId, dealId, title, body, assigneeId, dueAt);
      if (!task) return fail(500, "server_error");
      return json(201, { ok: true, task });
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
    const patch: { title?: string; body?: string; status?: TaskStatus; assigneeId?: string | null; dueAt?: string | null } = {};
    if (b.title !== undefined) {
      const title = typeof b.title === "string" ? b.title.trim() : "";
      if (!title || title.length > 200) return fail(422, "invalid_input", { field: "title" });
      patch.title = title;
    }
    if (b.body !== undefined) {
      if (typeof b.body !== "string" || b.body.length > 10000) return fail(422, "invalid_input", { field: "body" });
      patch.body = b.body;
    }
    if (b.status !== undefined) {
      const st = parseTaskStatus(b.status);
      if (!st) return fail(422, "invalid_input", { field: "status" });
      patch.status = st;
    }
    if (b.assigneeId !== undefined) {
      if (b.assigneeId === null || b.assigneeId === "") patch.assigneeId = null;
      else if (typeof b.assigneeId === "string" && ID_PATTERN.test(b.assigneeId)) patch.assigneeId = b.assigneeId;
      else return fail(422, "invalid_input", { field: "assigneeId" });
    }
    if (b.dueAt !== undefined) patch.dueAt = typeof b.dueAt === "string" ? b.dueAt : null;

    return withWorkspace(member, async (actor, db) => {
      if (actor.role === "operator") {
        const all = await listTasks(db, actor.tenantId);
        const existing = all.find((t) => t.id === id);
        if (!existing) return fail(404, "not_found");
        const deal = await getDeal(db, actor.tenantId, existing.dealId);
        if (!deal || deal.assigneeId !== actor.memberId) return fail(403, "forbidden");
      }
      const task = await updateTask(db, actor.tenantId, id, patch);
      if (!task) return fail(404, "not_found");
      return json(200, { ok: true, task });
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
        const all = await listTasks(db, actor.tenantId);
        const existing = all.find((t) => t.id === id);
        if (!existing) return fail(404, "not_found");
        const deal = await getDeal(db, actor.tenantId, existing.dealId);
        if (!deal || deal.assigneeId !== actor.memberId) return fail(403, "forbidden");
      }
      const ok = await deleteTask(db, actor.tenantId, id);
      if (!ok) return fail(404, "not_found");
      return json(200, { ok: true });
    });
  });
