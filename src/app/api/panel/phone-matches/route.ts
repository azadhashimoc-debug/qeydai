import {
  canWrite,
  confirmPhoneMatch,
  fail,
  getPanelAuthConfig,
  json,
  listContacts,
  listDeals,
  listPhoneMatches,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const [rawMatches, contacts] = await Promise.all([
        listPhoneMatches(db, actor.tenantId),
        listContacts(db, actor.tenantId),
      ]);
      let scopedMatches = rawMatches;
      if (actor.role === "operator") {
        const deals = await listDeals(db, actor.tenantId);
        const visibleContactIds = new Set(
          deals.filter((d) => d.assigneeId === null || d.assigneeId === actor.memberId).map((d) => d.contactId),
        );
        scopedMatches = rawMatches.filter((m) => visibleContactIds.has(m.contactId));
      }
      const contactById = new Map(contacts.map((c) => [c.id, c]));
      const matches = scopedMatches.map((m) => ({
        ...m,
        contactName: contactById.get(m.contactId)?.name ?? m.senderId,
        externalUserId: m.senderId,
        phoneNormalized: m.normalizedPhone,
        confirmedAt: m.confirmed ? m.createdAt : null,
      }));
      return json(200, { ok: true, matches });
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
    const id = typeof b.id === "string" ? b.id.trim() : "";
    if (!id || id.length > 128 || !ID_PATTERN.test(id)) return fail(422, "invalid_input", { field: "id" });

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "phoneMatches")) return fail(403, "forbidden");
      if (actor.role === "operator") {
        const match = (await listPhoneMatches(db, actor.tenantId)).find((m) => m.id === id);
        if (!match) return fail(404, "not_found");
        const deals = await listDeals(db, actor.tenantId);
        const visible = deals.some(
          (d) => d.contactId === match.contactId && (d.assigneeId === null || d.assigneeId === actor.memberId),
        );
        if (!visible) return fail(403, "forbidden");
      }
      const ok = await confirmPhoneMatch(db, actor.tenantId, id);
      if (!ok) return fail(404, "not_found");
      return json(200, { ok: true });
    });
  });
