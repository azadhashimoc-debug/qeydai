import { randomUUID } from "node:crypto";
import {
  createContact,
  createDeal,
  createTask,
  fail,
  getContact,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { normalizeAzPhone } from "@/lib/enrollment/enrollment";

/**
 * Authenticated first-contact workflow for staff.
 * All writes share withWorkspace's tenant-scoped PostgreSQL transaction / SQLite
 * savepoint. A failed deal or task throws so that no orphan contact is committed.
 * This is a CRM intake endpoint, NOT an AI-generated customer reply.
 */
export const POST = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "invalid_json");
    const input = raw as Record<string, unknown>;
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const details = typeof input.message === "string" ? input.message.trim() : "";
    const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
    const phone = rawPhone ? normalizeAzPhone(rawPhone) : null;
    const source = input.source === undefined ? "manual" : input.source;
    if (!name || name.length > 120) return fail(422, "invalid_input", { field: "name" });
    if (!title || title.length > 120) return fail(422, "invalid_input", { field: "title" });
    if (!details || details.length > 10000) return fail(422, "invalid_input", { field: "message" });
    if (rawPhone && !phone) return fail(422, "invalid_input", { field: "phone" });
    if (source !== "manual" && source !== "web") return fail(422, "invalid_input", { field: "source" });

    return withWorkspace(member, async (actor, db) => {
      // Operators can view/handle assigned deals but cannot create contacts.
      if (actor.role === "operator") return fail(403, "forbidden");
      let contact = null;
      if (phone) {
        const existing = await db.query<{ id: string }>(
          "SELECT id FROM sales_contacts WHERE tenant_id=$1 AND phone=$2 LIMIT 1",
          [actor.tenantId, phone],
        );
        if (existing.rows[0]) contact = await getContact(db, actor.tenantId, existing.rows[0].id);
      }
      contact ??= await createContact(db, actor.tenantId, name, phone);
      if (!contact) throw new Error("intake_contact_failed");
      const deal = await createDeal(
        db, actor.tenantId, randomUUID(), contact.id, "new", title, source, 0, details,
      );
      if (!deal) throw new Error("intake_deal_failed");
      const task = await createTask(
        db, actor.tenantId, deal.id, "Müştəri müraciətini cavablandır", details,
        null, null,
      );
      if (!task) throw new Error("intake_task_failed");
      return json(201, { ok: true, contact, deal, task });
    });
  });
