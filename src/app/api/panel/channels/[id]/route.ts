import {
  fail,
  getPanelAuthConfig,
  json,
  requireBody,
  runPanelCRM,
  withWorkspace,
} from "@/lib/api/panel-crm";
import { deleteTenantConnection, updateTenantConnection } from "@/lib/crm/connections-store";
import { hasChannelEncryptionKey } from "@/lib/crypto/secrets";
import { getSiteUrl } from "@/lib/http/site-url";

const CONNECTION_ID_RE = /^(telegram|whatsapp|instagram):[A-Za-z0-9_-]{1,128}$/;

export const PATCH = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const rawId = decodeURIComponent((await params).id);
    if (!CONNECTION_ID_RE.test(rawId)) return fail(422, "invalid_input", { field: "id" });

    const text = await requireBody(req);
    if (text === null) return fail(413, "payload_too_large");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail(400, "invalid_json");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail(400, "invalid_json");
    }
    const b = parsed as Record<string, unknown>;
    const patch: {
      displayName?: string;
      active?: boolean;
      automationEnabled?: boolean;
      token?: string;
    } = {};

    if (b.displayName !== undefined) {
      if (typeof b.displayName !== "string" || !b.displayName.trim() || b.displayName.trim().length > 120) {
        return fail(422, "invalid_input", { field: "displayName" });
      }
      patch.displayName = b.displayName.trim();
    }
    if (b.active !== undefined) {
      if (typeof b.active !== "boolean") return fail(422, "invalid_input", { field: "active" });
      patch.active = b.active;
    }
    if (b.automationEnabled !== undefined) {
      if (typeof b.automationEnabled !== "boolean") {
        return fail(422, "invalid_input", { field: "automationEnabled" });
      }
      patch.automationEnabled = b.automationEnabled;
    }
    if (b.token !== undefined) {
      if (typeof b.token !== "string" || b.token.trim().length < 10 || b.token.trim().length > 1024) {
        return fail(422, "invalid_input", { field: "token" });
      }
      if (!hasChannelEncryptionKey()) return fail(503, "channel_encryption_not_configured");
      patch.token = b.token.trim();
    }

    if (Object.keys(patch).length === 0) return fail(422, "invalid_input");

    return withWorkspace(member, async (actor, db) => {
      if (actor.role !== "owner" && actor.role !== "manager") return fail(403, "forbidden");
      const base = getSiteUrl() || new URL(req.url).origin;
      const updated = await updateTenantConnection(db, actor.tenantId, rawId, base, patch);
      if (!updated) return fail(404, "not_found");
      return json(200, { ok: true, connection: updated });
    });
  });

export const DELETE = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  runPanelCRM(req, getPanelAuthConfig, async (member) => {
    const rawId = decodeURIComponent((await params).id);
    if (!CONNECTION_ID_RE.test(rawId)) return fail(422, "invalid_input", { field: "id" });

    return withWorkspace(member, async (actor, db) => {
      if (actor.role !== "owner" && actor.role !== "manager") return fail(403, "forbidden");
      const removed = await deleteTenantConnection(db, actor.tenantId, rawId);
      if (!removed) return fail(404, "not_found");
      return json(200, { ok: true });
    });
  });
