import {
  buildPanelCookieHeader,
  clearPanelCookieHeader,
  createAccountSessionToken,
  DEFAULT_PANEL_TTL_MS,
  getPanelAuthConfig,
  isPanelJtiRevoked,
  PANEL_COOKIE_NAME,
  readCookieValue,
  revokePanelJti,
  verifyAnyPanelToken,
} from "../api/panel-auth";
import { isSecureRequest } from "../api/panel-api";
import { databaseConfigured } from "../crm/store";
import { clientKey, noStoreHeaders, sameOrigin } from "../http/same-origin";
import { readLimitedUtf8 } from "../http/read-body";
import { createRateLimiter } from "../rate-limit";
import { authenticateAccount, changeAccountPassword, createAccountWithWorkspace, deleteAccount } from "./accounts";
import { checkPasswordPolicy, normalizeEmail } from "./password";

const MAX_BODY = 4096;

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  Response.json(body, { status, headers: { ...noStoreHeaders, ...(headers ?? {}) } });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  json(status, { ok: false, error, ...extra });

const ipLimiter = createRateLimiter({ max: 10, windowMs: 60_000, maxKeys: 10_000, evictOnFull: true });
const emailLimiter = createRateLimiter({ max: 6, windowMs: 60_000, maxKeys: 10_000, evictOnFull: true });

async function readBody(req: Request): Promise<Record<string, unknown> | Response> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return fail(415, "unsupported_media_type");
  }
  const text = await readLimitedUtf8(req, MAX_BODY);
  if (text === null) return fail(413, "payload_too_large");
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // fall through
  }
  return fail(400, "invalid_json");
}

function sessionResponse(req: Request, tenantId: string, memberId: string, accountSecret: Buffer) {
  const token = createAccountSessionToken(tenantId, memberId, accountSecret);
  const cookie = buildPanelCookieHeader(token, isSecureRequest(req), DEFAULT_PANEL_TTL_MS / 1000);
  return json(200, { ok: true, tenantId }, { "set-cookie": cookie });
}

export async function registerHandler(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  if (!ipLimiter.allow(`reg:${clientKey(req)}`)) return fail(429, "rate_limited");
  const accountSecret = getPanelAuthConfig().accountSecret;
  if (!accountSecret || !databaseConfigured()) return fail(503, "unavailable");

  const body = await readBody(req);
  if (body instanceof Response) return body;

  const email = normalizeEmail(body.email);
  if (!email) return fail(422, "invalid_input", { field: "email" });
  const policy = checkPasswordPolicy(body.password);
  if (!policy.ok) return fail(422, "invalid_input", { field: "password", reason: policy.reason });
  const businessName = typeof body.name === "string" ? body.name.trim() : "";
  if (businessName.length < 2 || businessName.length > 120) return fail(422, "invalid_input", { field: "name" });

  try {
    const result = await createAccountWithWorkspace({ email, password: body.password as string, businessName });
    if (!result.ok) return fail(409, result.reason);
    return sessionResponse(req, result.tenantId, result.memberId, accountSecret);
  } catch (err) {
    console.error("register failed:", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error");
  }
}

export async function loginHandler(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  if (!ipLimiter.allow(`login:${clientKey(req)}`)) return fail(429, "rate_limited");
  const accountSecret = getPanelAuthConfig().accountSecret;
  if (!accountSecret || !databaseConfigured()) return fail(503, "unavailable");

  const body = await readBody(req);
  if (body instanceof Response) return body;

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || password.length > 128) return fail(401, "unauthorized");
  if (!emailLimiter.allow(`login:${email}`)) return fail(429, "rate_limited");

  try {
    const account = await authenticateAccount(email, password);
    if (!account) return fail(401, "unauthorized");
    return sessionResponse(req, account.tenantId, account.memberId, accountSecret);
  } catch (err) {
    console.error("login failed:", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error");
  }
}

async function requireAuthenticatedAccountSession(req: Request) {
  const config = getPanelAuthConfig();
  const token = readCookieValue(req.headers.get("cookie"), PANEL_COOKIE_NAME);
  if (!token || !config.accountSecret) return null;
  const nowMs = Date.now();
  const session = verifyAnyPanelToken(token, config, nowMs);
  if (!session || !session.memberId) return null;
  if (await isPanelJtiRevoked(session.jti, nowMs)) return null;
  return session;
}

export async function changePasswordHandler(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  if (!ipLimiter.allow(`pw:${clientKey(req)}`)) return fail(429, "rate_limited");
  if (!databaseConfigured()) return fail(503, "unavailable");

  const session = await requireAuthenticatedAccountSession(req);
  if (!session) return fail(401, "unauthorized");

  const body = await readBody(req);
  if (body instanceof Response) return body;

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword || currentPassword.length > 128) return fail(401, "unauthorized");
  const policy = checkPasswordPolicy(body.newPassword);
  if (!policy.ok) return fail(422, "invalid_input", { field: "newPassword", reason: policy.reason });

  try {
    const res = await changeAccountPassword({
      tenantId: session.tenantId,
      memberId: session.memberId,
      currentPassword,
      newPassword: body.newPassword as string,
    });
    if (!res.ok) {
      return res.reason === "not_found" ? fail(404, "not_found") : fail(401, "unauthorized");
    }
    await revokePanelJti(session.jti, session.exp);
    const accountSecret = getPanelAuthConfig().accountSecret;
    if (!accountSecret) return fail(503, "unavailable");
    return sessionResponse(req, session.tenantId, session.memberId, accountSecret);
  } catch (err) {
    console.error("password change failed:", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error");
  }
}

export async function deleteAccountHandler(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  if (!ipLimiter.allow(`del:${clientKey(req)}`)) return fail(429, "rate_limited");
  if (!databaseConfigured()) return fail(503, "unavailable");

  const session = await requireAuthenticatedAccountSession(req);
  if (!session) return fail(401, "unauthorized");

  const body = await readBody(req);
  if (body instanceof Response) return body;

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length > 128) return fail(401, "unauthorized");

  try {
    const res = await deleteAccount({
      tenantId: session.tenantId,
      memberId: session.memberId,
      password,
    });
    if (!res.ok) {
      return res.reason === "not_found" ? fail(404, "not_found") : fail(401, "unauthorized");
    }
    await revokePanelJti(session.jti, session.exp);
    return json(200, { ok: true }, { "set-cookie": clearPanelCookieHeader(isSecureRequest(req)) });
  } catch (err) {
    console.error("account delete failed:", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error");
  }
}
