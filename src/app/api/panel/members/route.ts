import {
  canWrite,
  createMember,
  fail,
  getPanelAuthConfig,
  json,
  listMembers,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { enforceWorkspaceLimit } from "@/lib/billing/entitlements";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
type MemberRole = "owner" | "manager" | "operator";

function parseRole(raw: unknown): MemberRole | null {
  if (raw === undefined) return "operator";
  if (raw === "owner" || raw === "manager" || raw === "operator") return raw;
  return null;
}

export const GET = (req: Request) =>
  runPanelCRM(req, getPanelAuthConfig, (member) =>
    withWorkspace(member, async (actor, db) => {
      const members = await listMembers(db, actor.tenantId);
      const visible = actor.role === "operator" ? members.filter((m) => m.id === actor.memberId) : members;
      return json(200, { ok: true, members: visible });
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
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 120) return fail(422, "invalid_input", { field: "name" });
    const role = parseRole(b.role);
    if (!role) return fail(422, "invalid_input", { field: "role" });

    return withWorkspace(member, async (actor, db) => {
      if (!canWrite(actor.role, "members")) return fail(403, "forbidden");
      if (actor.role === "manager" && role === "owner") return fail(403, "forbidden");
      const limitCheck = await enforceWorkspaceLimit(db, actor.tenantId, "members");
      if (!limitCheck.ok) {
        return fail(limitCheck.status, limitCheck.error, {
          resource: limitCheck.resource,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        });
      }
      const created = await createMember(db, actor.tenantId, id, name, role);
      if (!created) return fail(409, "member_exists");
      return json(201, { ok: true, member: created });
    });
  });
