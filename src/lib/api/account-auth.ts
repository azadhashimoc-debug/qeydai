import { randomBytes, randomUUID, scrypt as rawScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Pool } from "pg";
import defaultSalesStagesAz from "../../app/[lang]/dictionaries/default-sales-stages-az.json";
import {
  buildExistingAccountNoticeMessage,
  buildPasswordResetMessage,
  buildVerifyEmailMessage,
  type EmailLocale,
} from "../../app/[lang]/dictionaries/email-templates";
import {
  buildPanelCookieHeader, buildPanelHintCookieHeader, createPanelSessionToken, DEFAULT_PANEL_TTL_MS,
  getPanelAuthConfig, isPanelJtiRevoked, PANEL_COOKIE_NAME, readCookieValue, verifyPanelSessionToken,
} from "./panel-auth";
import { getSharedPgPool } from "../db/pool";
import { isEmailConfigured, sendTransactionalEmail } from "../email/resend";
import { assertSafeApplicationRole } from "../enrollment/postgres-store";
import { ensurePanelJtiStore } from "./instance";
import { isUnknownClient } from "../http/same-origin";
import { getSiteUrl, isSecureRequest } from "../http/site-url";
import { reportServerError } from "../observability/alerts";
import { consumeAccountToken, createAccountToken } from "./account-tokens";
import {
  allowAuthAttempt,
  clientIp,
  FORGOT_PASSWORD_PER_EMAIL,
  FORGOT_PASSWORD_PER_IP,
  LOGIN_PER_EMAIL,
  LOGIN_PER_IP,
  REGISTER_PER_IP,
  RESEND_VERIFY_PER_EMAIL,
  RESEND_VERIFY_PER_IP,
  RESET_PASSWORD_PER_IP,
} from "./auth-rate-limit";

const scrypt = promisify(rawScrypt);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type Account = { tenant_id: string; id: string; email: string; password_hash: string };
/** OAuth link columns (migration 0009). Read only by the OAuth paths, so email sign-in works without them. */
export type OAuthLinkState = { oauth_providers: string[]; password_login_enabled: boolean };
const genericError = (status: number, error: string, extra?: Record<string, unknown>) =>
  Response.json({ ok: false, error, ...(extra ?? {}) }, { status, headers: { "Cache-Control": "no-store" } });
const parseLocale = (value: unknown): EmailLocale => (value === "en" ? "en" : "az");

function dbPool(): Pool {
  if (!process.env.QEYDAI_DATABASE_URL) throw new Error("database_unavailable");
  return getSharedPgPool();
}
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64) as Buffer;
  return "scrypt$" + salt.toString("base64url") + "$" + hash.toString("base64url");
}
// Verified against when no account exists, so unknown emails cost the same scrypt work as known ones.
let dummyHash: Promise<string> | undefined;
async function matchesPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const expected = Buffer.from(parts[2], "base64url");
  if (salt.length !== 16 || expected.length !== 64) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, expected);
}
export async function findByEmail(email: string): Promise<Account | null> {
  const db = await dbPool().connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.auth_email', $1, true)", [email]);
    const result = await db.query<Account>(
      "SELECT tenant_id,id,email,password_hash FROM panel_accounts WHERE email=$1", [email],
    );
    await db.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
async function existsByTenant(tenant: string, id: string): Promise<boolean> {
  const db = await dbPool().connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    const found = await db.query("SELECT 1 FROM panel_accounts WHERE tenant_id=$1 AND id=$2", [tenant, id]);
    await db.query("COMMIT");
    return found.rows.length > 0;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
function sameOrigin(req: Request): boolean {
  const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
async function body(req: Request): Promise<Record<string, unknown> | null> {
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return null;
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 4096) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}
export function hasStableSessionSecret(): boolean {
  return (process.env.QEYDAI_PANEL_SECRET?.trim().length ?? 0) >= 24;
}
function issueCookie(tenant: string, id: string, req: Request): Response {
  if (!hasStableSessionSecret()) return genericError(503, "account_auth_unavailable");
  const secret = getPanelAuthConfig().secret;
  if (!secret) return genericError(503, "account_auth_unavailable");
  const token = createPanelSessionToken(tenant, secret, Date.now(), DEFAULT_PANEL_TTL_MS, undefined, "account:" + id);
  const secure = isSecureRequest(req);
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", buildPanelCookieHeader(token, secure, DEFAULT_PANEL_TTL_MS / 1000));
  // Lets the panel UI know a session may exist without exposing the HttpOnly token.
  headers.append("Set-Cookie", buildPanelHintCookieHeader(secure, DEFAULT_PANEL_TTL_MS / 1000));
  return Response.json({ ok: true, tenantId: tenant }, { headers });
}

/** Session cookies for a redirect-based sign-in (OAuth callback); the caller sets them on its own response. */
export function accountSessionCookieHeaders(tenant: string, id: string, req: Request): string[] | null {
  if (!hasStableSessionSecret()) return null;
  const secret = getPanelAuthConfig().secret;
  if (!secret) return null;
  const token = createPanelSessionToken(tenant, secret, Date.now(), DEFAULT_PANEL_TTL_MS, undefined, "account:" + id);
  const secure = isSecureRequest(req);
  return [
    buildPanelCookieHeader(token, secure, DEFAULT_PANEL_TTL_MS / 1000),
    buildPanelHintCookieHeader(secure, DEFAULT_PANEL_TTL_MS / 1000),
  ];
}

/**
 * Creates a workspace + owner account for a first-time OAuth sign-in. The stored password is random
 * and unknown to anyone, so the account can only be used through the provider.
 * Returns "exists" when a concurrent request already created the email.
 */
export async function provisionOAuthAccount(
  email: string, businessName: string, provider: string,
): Promise<{ tenantId: string; accountId: string } | "exists" | null> {
  const name = businessName.length >= 2 && businessName.length <= 120 ? businessName : (email.split("@")[0].slice(0, 120).padEnd(2, "_"));
  const tenant = "biz_" + randomUUID();
  const id = randomUUID();
  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
  let db;
  try {
    db = await dbPool().connect();
  } catch {
    return null;
  }
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    await db.query("INSERT INTO sales_workspaces (id,name) VALUES ($1,$2)", [tenant, name]);
    await db.query(
      `INSERT INTO panel_accounts (tenant_id,id,email,password_hash,oauth_providers,password_login_enabled)
       VALUES ($1,$2,$3,$4,ARRAY[$5]::text[],false)`,
      [tenant, id, email, passwordHash, provider],
    );
    await db.query(`
      INSERT INTO sales_stages (tenant_id,id,name,position,kind)
      VALUES ($1,'new',$2,0,'open'),($1,'contacted',$3,1,'open'),
             ($1,'trial_booked',$4,2,'open'),($1,'paid',$5,3,'won'),($1,'lost',$6,4,'lost')
    `, [tenant, defaultSalesStagesAz.new, defaultSalesStagesAz.contacted,
        defaultSalesStagesAz.trial_booked, defaultSalesStagesAz.paid, defaultSalesStagesAz.lost]);
    await db.query("COMMIT");
    return { tenantId: tenant, accountId: id };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return "exists";
    return null;
  } finally {
    db.release();
  }
}

export async function findOAuthLinkState(tenant: string, id: string): Promise<OAuthLinkState | null> {
  const db = await dbPool().connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    const found = await db.query<OAuthLinkState>(
      "SELECT oauth_providers, password_login_enabled FROM panel_accounts WHERE tenant_id=$1 AND id=$2",
      [tenant, id],
    );
    await db.query("COMMIT");
    return found.rows[0] ?? null;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

/** Records a provider on an account after its password was confirmed (or on a password-less account). */
export async function linkOAuthProvider(tenant: string, id: string, provider: string): Promise<void> {
  const db = await dbPool().connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    await db.query(
      `UPDATE panel_accounts SET oauth_providers = array_append(oauth_providers, $3)
       WHERE tenant_id=$1 AND id=$2 AND NOT ($3 = ANY(oauth_providers))`,
      [tenant, id, provider],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}

/**
 * Password check for linking an OAuth provider to an existing account (by id, since the link token
 * carries no email). Shares the per-account login rate limit with password sign-in.
 */
export async function verifyAccountPasswordById(
  tenant: string, id: string, password: string,
): Promise<"ok" | "bad" | "limited" | "unavailable"> {
  if (password.length === 0 || password.length > 128) return "bad";
  const pool = dbPool();
  try {
    if (!(await allowAuthAttempt(pool, LOGIN_PER_EMAIL, tenant + ":" + id))) return "limited";
  } catch {
    return "unavailable";
  }
  const db = await pool.connect();
  let stored: string | undefined;
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    const found = await db.query<{ password_hash: string }>(
      "SELECT password_hash FROM panel_accounts WHERE tenant_id=$1 AND id=$2", [tenant, id],
    );
    await db.query("COMMIT");
    stored = found.rows[0]?.password_hash;
  } catch {
    await db.query("ROLLBACK").catch(() => {});
    return "unavailable";
  } finally {
    db.release();
  }
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  const ok = await matchesPassword(password, stored ?? await dummyHash);
  return ok && stored ? "ok" : "bad";
}

async function isAccountEmailVerified(tenant: string, id: string): Promise<boolean> {
  const db = await dbPool().connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    const res = await db.query<{ verified: boolean }>(
      `SELECT (email_verified_at IS NOT NULL OR COALESCE(array_length(oauth_providers, 1), 0) > 0) AS verified
       FROM panel_accounts
       WHERE tenant_id = $1 AND id = $2`,
      [tenant, id],
    );
    await db.query("COMMIT");
    return Boolean(res.rows[0]?.verified);
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    // Migration 0011 not yet applied: allow sign-in until the column exists.
    if (error && typeof error === "object" && "code" in error && error.code === "42703") {
      return true;
    }
    throw error;
  } finally {
    db.release();
  }
}

async function sendVerificationEmailForAccount(
  tenantId: string,
  accountId: string,
  email: string,
  locale: EmailLocale,
): Promise<void> {
  const { rawToken } = await createAccountToken(dbPool(), {
    tenantId,
    accountId,
    email,
    kind: "verify_email",
  });
  const verifyUrl = `${getSiteUrl()}/${locale}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const message = buildVerifyEmailMessage(locale, verifyUrl);
  const result = await sendTransactionalEmail({ to: email, ...message });
  if (!result.ok && !result.skipped) {
    void reportServerError("email.verify.send", new Error(result.reason));
  }
}

function verificationAcceptedResponse(): Response {
  return Response.json(
    { ok: true, verificationRequired: true },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

export async function registerBusiness(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return genericError(403, "forbidden");
  const input = await body(req);
  if (!input) return genericError(400, "invalid_json");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const name = typeof input.businessName === "string" ? input.businessName.trim() : "";
  const locale = parseLocale(input.locale);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return genericError(422, "invalid_input", { field: "email" });
  }
  if (name.length < 2 || name.length > 120) {
    return genericError(422, "invalid_input", { field: "name" });
  }
  if (password.length < 12 || password.length > 128 || Buffer.byteLength(password) > 256) {
    return genericError(422, "invalid_input", { field: "password" });
  }
  try {
    if (!(await allowAuthAttempt(dbPool(), REGISTER_PER_IP, clientIp(req)))) {
      return genericError(429, "rate_limited");
    }
  } catch {
    return genericError(503, "database_unavailable");
  }
  if (!hasStableSessionSecret() || !getPanelAuthConfig().secret) return genericError(503, "account_auth_unavailable");
  const tenant = "biz_" + randomUUID();
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  const db = await dbPool().connect();
  try {
    await db.query("BEGIN");
    await assertSafeApplicationRole(db);
    await db.query("SELECT set_config('app.tenant_id', $1, true)", [tenant]);
    await db.query("INSERT INTO sales_workspaces (id,name,locale) VALUES ($1,$2,$3)", [tenant, name, locale]);
    await db.query(
      "INSERT INTO panel_accounts (tenant_id,id,email,password_hash) VALUES ($1,$2,$3,$4)",
      [tenant, id, email, passwordHash],
    );
    await db.query(`
      INSERT INTO sales_stages (tenant_id,id,name,position,kind)
      VALUES ($1,'new',$2,0,'open'),($1,'contacted',$3,1,'open'),
             ($1,'trial_booked',$4,2,'open'),($1,'paid',$5,3,'won'),($1,'lost',$6,4,'lost')
    `, [tenant, defaultSalesStagesAz.new, defaultSalesStagesAz.contacted,
        defaultSalesStagesAz.trial_booked, defaultSalesStagesAz.paid, defaultSalesStagesAz.lost]);
    await db.query("COMMIT");

    if (isEmailConfigured()) {
      await sendVerificationEmailForAccount(tenant, id, email, locale).catch((err) => {
        void reportServerError("api.account.register.email", err);
      });
      return verificationAcceptedResponse();
    }
    return issueCookie(tenant, id, req);
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      // Never disclose whether an email is already registered (anti-enumeration).
      if (isEmailConfigured()) {
        const siteUrl = getSiteUrl();
        const notice = buildExistingAccountNoticeMessage(
          locale,
          `${siteUrl}/${locale}/login`,
          `${siteUrl}/${locale}/forgot-password`,
        );
        void sendTransactionalEmail({ to: email, ...notice }).then((result) => {
          if (!result.ok && !result.skipped) {
            void reportServerError("email.existing_account.send", new Error(result.reason));
          }
        });
      }
      return verificationAcceptedResponse();
    }
    void reportServerError("api.account.register", error);
    return genericError(503, "database_unavailable");
  } finally {
    db.release();
  }
}

export async function loginBusiness(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return genericError(403, "forbidden");
  if (!hasStableSessionSecret()) return genericError(503, "account_auth_unavailable");
  const input = await body(req);
  if (!input) return genericError(400, "invalid_json");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!EMAIL_RE.test(email) || password.length > 128) return genericError(401, "invalid_credentials");
  try {
    const pool = dbPool();
    // An untrusted ("unknown") IP would be one bucket shared by every caller; the per-email
    // limit still applies in that case.
    const ip = clientIp(req);
    if ((!isUnknownClient(ip) && !(await allowAuthAttempt(pool, LOGIN_PER_IP, ip))) ||
        !(await allowAuthAttempt(pool, LOGIN_PER_EMAIL, email))) {
      return genericError(429, "rate_limited");
    }
    const account = await findByEmail(email);
    dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
    const ok = await matchesPassword(password, account?.password_hash ?? await dummyHash);
    if (!account || !ok) {
      return genericError(401, "invalid_credentials");
    }
    if (isEmailConfigured() && !(await isAccountEmailVerified(account.tenant_id, account.id))) {
      return genericError(403, "email_not_verified");
    }
    if (!ensurePanelJtiStore()) return genericError(503, "database_unavailable");
    return issueCookie(account.tenant_id, account.id, req);
  } catch (error) {
    void reportServerError("api.account.login", error);
    return genericError(503, "database_unavailable");
  }
}

export async function verifyAccountEmail(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return genericError(403, "forbidden");
  const input = await body(req);
  if (!input) return genericError(400, "invalid_json");
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!token) return genericError(400, "invalid_or_expired_token");

  try {
    const pool = dbPool();
    const consumed = await consumeAccountToken(pool, { rawToken: token, kind: "verify_email" });
    if (!consumed) return genericError(400, "invalid_or_expired_token");

    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await assertSafeApplicationRole(db);
      await db.query("SELECT set_config('app.tenant_id', $1, true)", [consumed.tenantId]);
      await db.query(
        `UPDATE panel_accounts
         SET email_verified_at = COALESCE(email_verified_at, now())
         WHERE tenant_id = $1 AND id = $2`,
        [consumed.tenantId, consumed.accountId],
      );
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      db.release();
    }

    if (hasStableSessionSecret() && getPanelAuthConfig().secret && ensurePanelJtiStore()) {
      return issueCookie(consumed.tenantId, consumed.accountId, req);
    }
    return Response.json({ ok: true, verified: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    void reportServerError("api.account.verify_email", error);
    return genericError(503, "database_unavailable");
  }
}

export async function resendVerificationEmail(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return genericError(403, "forbidden");
  const input = await body(req);
  if (!input) return genericError(400, "invalid_json");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const locale = parseLocale(input.locale);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return genericError(422, "invalid_input", { field: "email" });
  }

  try {
    const pool = dbPool();
    const ip = clientIp(req);
    if ((!isUnknownClient(ip) && !(await allowAuthAttempt(pool, RESEND_VERIFY_PER_IP, ip))) ||
        !(await allowAuthAttempt(pool, RESEND_VERIFY_PER_EMAIL, email))) {
      return genericError(429, "rate_limited");
    }
    if (isEmailConfigured()) {
      const account = await findByEmail(email);
      if (account && !(await isAccountEmailVerified(account.tenant_id, account.id))) {
        await sendVerificationEmailForAccount(account.tenant_id, account.id, email, locale);
      }
    }
    // Generic response regardless of whether the email exists or is already verified.
    return Response.json(
      { ok: true, emailConfigured: isEmailConfigured() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    void reportServerError("api.account.resend_verification", error);
    return genericError(503, "database_unavailable");
  }
}

export async function requestPasswordReset(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return genericError(403, "forbidden");
  const input = await body(req);
  if (!input) return genericError(400, "invalid_json");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const locale = parseLocale(input.locale);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return genericError(422, "invalid_input", { field: "email" });
  }

  try {
    const pool = dbPool();
    const ip = clientIp(req);
    if ((!isUnknownClient(ip) && !(await allowAuthAttempt(pool, FORGOT_PASSWORD_PER_IP, ip))) ||
        !(await allowAuthAttempt(pool, FORGOT_PASSWORD_PER_EMAIL, email))) {
      return genericError(429, "rate_limited");
    }
    if (isEmailConfigured()) {
      const account = await findByEmail(email);
      if (account) {
        const { rawToken } = await createAccountToken(pool, {
          tenantId: account.tenant_id,
          accountId: account.id,
          email,
          kind: "reset_password",
        });
        const resetUrl = `${getSiteUrl()}/${locale}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const message = buildPasswordResetMessage(locale, resetUrl);
        const result = await sendTransactionalEmail({ to: email, ...message });
        if (!result.ok && !result.skipped) {
          void reportServerError("email.password_reset.send", new Error(result.reason));
        }
      }
    }
    // Always return the same response so unknown emails cannot be probed.
    return Response.json(
      { ok: true, emailConfigured: isEmailConfigured() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    void reportServerError("api.account.forgot_password", error);
    return genericError(503, "database_unavailable");
  }
}

export async function resetAccountPassword(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return genericError(403, "forbidden");
  const input = await body(req);
  if (!input) return genericError(400, "invalid_json");
  const token = typeof input.token === "string" ? input.token.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!token) return genericError(400, "invalid_or_expired_token");
  if (password.length < 12 || password.length > 128 || Buffer.byteLength(password) > 256) {
    return genericError(422, "invalid_input", { field: "password" });
  }

  try {
    const pool = dbPool();
    const ip = clientIp(req);
    if (!isUnknownClient(ip) && !(await allowAuthAttempt(pool, RESET_PASSWORD_PER_IP, ip))) {
      return genericError(429, "rate_limited");
    }
    const consumed = await consumeAccountToken(pool, { rawToken: token, kind: "reset_password" });
    if (!consumed) return genericError(400, "invalid_or_expired_token");

    const passwordHash = await hashPassword(password);
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await assertSafeApplicationRole(db);
      await db.query("SELECT set_config('app.tenant_id', $1, true)", [consumed.tenantId]);
      await db.query(
        `UPDATE panel_accounts
         SET password_hash = $3,
             password_login_enabled = true,
             email_verified_at = COALESCE(email_verified_at, now())
         WHERE tenant_id = $1 AND id = $2`,
        [consumed.tenantId, consumed.accountId, passwordHash],
      );
      await db.query(
        `DELETE FROM panel_account_tokens
         WHERE tenant_id = $1 AND account_id = $2 AND kind = 'reset_password'`,
        [consumed.tenantId, consumed.accountId],
      );
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      db.release();
    }

    return Response.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    void reportServerError("api.account.reset_password", error);
    return genericError(503, "database_unavailable");
  }
}

/** Account-cookie verification is separate from legacy admin-key fingerprints. */
export async function readAccountSession(req: Request): Promise<{ tenantId: string; memberId: string; jti: string; exp: number } | null> {
  const config = getPanelAuthConfig();
  const token = readCookieValue(req.headers.get("cookie"), PANEL_COOKIE_NAME);
  if (!hasStableSessionSecret() || !config.secret || !token) return null;
  const payloadPart = token.split(".")[0];
  let tenant: string;
  try {
    const untrusted = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as { t?: unknown };
    if (typeof untrusted.t !== "string" || !/^biz_[a-f0-9-]{36}$/.test(untrusted.t)) return null;
    tenant = untrusted.t;
  } catch { return null; }
  const session = verifyPanelSessionToken(token, config.secret, new Set([tenant]));
  if (!session || !/^account:[a-f0-9-]{36}$/.test(session.memberId)) return null;
  if (!ensurePanelJtiStore() || await isPanelJtiRevoked(session.jti, Date.now(), tenant)) return null;
  const id = session.memberId.slice("account:".length);
  return await existsByTenant(tenant, id)
    ? { tenantId: tenant, memberId: "", jti: session.jti, exp: session.exp } : null;
}
