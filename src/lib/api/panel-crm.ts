import type { PoolClient } from "pg";
import { ensurePanelJtiStore } from "./instance";
import { createRateLimiter } from "../rate-limit";
import {
  verifyPanelSessionToken,
  isPanelJtiRevoked,
  PANEL_COOKIE_NAME,
  readCookieValue,
  getPanelAuthConfig,
} from "./panel-auth";
import {
  databaseConfigured,
  workspaceTransaction,
  initializeWorkspace,
  requireMember,
  canWrite,
  claimDeal,
  createDeal,
  deleteDeal,
  deleteContact,
  getDeal,
  listDeals,
  updateDeal,
  listContacts,
  createContact,
  getContact,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listNotes,
  createNote,
  deleteNote,
  listFieldDefs,
  createFieldDef,
  updateFieldDef,
  deleteFieldDef,
  getDealFieldValues,
  setDealFieldValues,
  listMembers,
  createMember,
  listPhoneMatches,
  confirmPhoneMatch,
  getWorkspace,
  updateWorkspace,
  listDealMessages,
  sendDealReply,
  listTimeline,
} from "../crm/store";
import { noStoreHeaders, sameOrigin } from "../http/same-origin";
import { readLimitedUtf8 } from "../http/read-body";

const MAX_CRM_BODY_BYTES = 16384;
const API_RATE_MAX = 600;

const apiLimiter = createRateLimiter({ max: API_RATE_MAX, windowMs: 60_000 });

export type PanelMember = {
  tenantId: string;
  memberId: string;
  role: "owner" | "manager" | "operator";
};

type AuthConfig = ReturnType<typeof getPanelAuthConfig>;

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  Response.json(body, { status, headers: headers ? { ...noStoreHeaders, ...headers } : { ...noStoreHeaders } });

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  json(status, { ok: false, error, ...extra });

export async function requirePanelMember(
  req: Request,
  getAuthConfig: () => AuthConfig,
): Promise<{ ok: true; value: PanelMember } | { ok: false; response: Response }> {
  if (!ensurePanelJtiStore()) return { ok: false, response: fail(503, "database_unavailable") };
  const config = getAuthConfig();
  const token = readCookieValue(req.headers.get("cookie"), PANEL_COOKIE_NAME);
  if (!config.secret || config.allowedKeysByTenant.size === 0 || !token) {
    return { ok: false, response: fail(401, "unauthorized") };
  }
  const nowMs = Date.now();
  const payload = verifyPanelSessionToken(token, config.secret, config.allowedKeysByTenant);
  if (!payload || (await isPanelJtiRevoked(payload.jti, nowMs, payload.tenantId))) {
    return { ok: false, response: fail(401, "unauthorized") };
  }
  return { ok: true, value: { tenantId: payload.tenantId, memberId: payload.memberId, role: "owner" } };
}

export async function withWorkspace(
  member: PanelMember,
  fn: (resolved: PanelMember, db: PoolClient) => Promise<Response>,
): Promise<Response> {
  return workspaceTransaction(member.tenantId, async (db) => {
    await initializeWorkspace(db, member.tenantId);
    let resolvedRole: PanelMember["role"] = "owner";
    if (member.memberId) {
      const found = await requireMember(db, member.tenantId, member.memberId);
      if (!found) return fail(403, "forbidden");
      resolvedRole = found.role;
    }
    return fn({ ...member, role: resolvedRole }, db);
  });
}

export async function runPanelCRM(
  req: Request,
  getAuthConfig: () => AuthConfig,
  fn: (member: PanelMember) => Promise<Response>,
): Promise<Response> {
  const auth = await requirePanelMember(req, getAuthConfig);
  if (!auth.ok) return auth.response;
  const member = auth.value;
  if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) {
    return fail(403, "forbidden");
  }
  if (!apiLimiter.allow(`${member.tenantId}:${member.memberId || "admin"}`)) {
    return fail(429, "rate_limited");
  }
  if (!databaseConfigured()) {
    return fail(503, "database_unavailable");
  }
  try {
    return await fn(member);
  } catch (err) {
    console.error("panel-crm error:", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error");
  }
}

export function requireBody(req: Request, maxBytes = MAX_CRM_BODY_BYTES) {
  return readLimitedUtf8(req, maxBytes);
}

export {
  json,
  fail,
  sameOrigin,
  databaseConfigured,
  workspaceTransaction,
  initializeWorkspace,
  requireMember,
  getPanelAuthConfig,
  canWrite,
  claimDeal,
  createDeal,
  deleteDeal,
  deleteContact,
  getDeal,
  listDeals,
  updateDeal,
  listContacts,
  createContact,
  getContact,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  listNotes,
  createNote,
  deleteNote,
  listFieldDefs,
  createFieldDef,
  updateFieldDef,
  deleteFieldDef,
  getDealFieldValues,
  setDealFieldValues,
  listMembers,
  createMember,
  listPhoneMatches,
  confirmPhoneMatch,
  getWorkspace,
  updateWorkspace,
  listDealMessages,
  sendDealReply,
  listTimeline,
};
