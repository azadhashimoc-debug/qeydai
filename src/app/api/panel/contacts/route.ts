import {
  canWrite,
  createContact,
  deleteContact,
  fail,
  getContact,
  getPanelAuthConfig,
  json,
  listContacts,
  listDeals,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { normalizeAzPhone } from "@/lib/enrollment/enrollment";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (id && (id.length > 128 || !ID_PATTERN.test(id))) {
      return Promise.resolve(fail(422, "invalid_input", { field: "id" }));
    }
    return withWorkspace(member, async (actor, db) => {
      let visibleContactIds: Set<string> | null = null;
      if (actor.role === "operator") {
        const deals = await listDeals(db, actor.tenantId);
        visibleContactIds = new Set(
          deals.filter((d) => d.assigneeId === null || d.assigneeId === actor.memberId).map((d) => d.contactId),
        );
      }
      if (id) {
        if (visibleContactIds && !visibleContactIds.has(id)) return fail(403, "forbidden");
        const contact = await getContact(db, actor.tenantId, id);
        if (!contact) return fail(404, "not_found");
        return json(200, { ok: true, contact });
      }
      const contacts = await listContacts(db, actor.tenantId);
      const visible = visibleContactIds ? contacts.filter((c) => visibleContactIds.has(c.id)) : contacts;
      return json(200, { ok: true, contacts: visible });
    });
  });

export const DELETE = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id || id.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) {
      return fail(422, "invalid_input", { field: "id" });
    }
    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "contacts")) return fail(403, "forbidden");
      const contact = await getContact(db, actor.tenantId, id);
      if (!contact) return fail(404, "not_found");
      const deleted = await deleteContact(db, actor.tenantId, id);
      if (!deleted) return fail(404, "not_found");
      return json(200, { ok: true });
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
    if (!name || name.length > 120) return fail(422, "invalid_input", { field: "name" });
    const rawPhone = typeof b.phone === "string" ? b.phone.trim() : "";
    let phone: string | null = null;
    if (rawPhone) {
      phone = normalizeAzPhone(rawPhone);
      if (!phone) return fail(422, "invalid_input", { field: "phone" });
    }

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "contacts")) return fail(403, "forbidden");
      const contact = await createContact(db, actor.tenantId, name, phone);
      if (!contact) return fail(409, "contact_exists");
      return json(201, { ok: true, contact });
    });
  });
