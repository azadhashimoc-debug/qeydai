import { randomBytes, randomUUID, scrypt as rawScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";
import defaultSalesStagesAz from "../../app/[lang]/dictionaries/default-sales-stages-az.json";
import {
  buildPanelCookieHeader, createPanelSessionToken, DEFAULT_PANEL_TTL_MS,
  getPanelAuthConfig, isPanelJtiRevoked, PANEL_COOKIE_NAME, readCookieValue, verifyPanelSessionToken,
} from "./panel-auth";
import { assertSafeApplicationRole } from "../enrollment/postgres-store";
import { ensurePanelJtiStore } from "./instance";
import {
  allowAuthAttempt, clientIp, LOGIN_PER_EMAIL, LOGIN_PER_IP, REGISTER_PER_IP,
} from "./auth-rate-limit";

const scrypt = promisify(rawScrypt);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let pool: Pool | undefined;
type Account = { tenant_id: string; id: string; email: string; password_hash: string };
const genericError = (status: number, error: string) =>
  Response.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

function dbPool(): Pool {
  if (!process.env.QEYDAI_DATABASE_URL) throw new Error("database_unavailable");
  pool ??= new Pool({ connectionString: process.env.QEYDAI_DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
  return pool;
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
async function findByEmail(email: string): Promise<Account | null> {
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
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
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
function hasStableSessionSecret(): boolean {
  return (process.env.QEYDAI_PANEL_SECRET?.trim().length ?? 0) >= 24;
}
function issueCookie(tenant: string, id: string, req: Request): Response {
  if (!hasStableSessionSecret()) return genericError(503, "account_auth_unavailable");
  const secret = getPanelAuthConfig().secret;
  if (!secret) return genericError(503, "account_auth_unavailable");
  const token = createPanelSessionToken(tenant, secret, Date.now(), DEFAULT_PANEL_TTL_MS, undefined, "account:" + id);
  return Response.json({ ok: true, tenantId: tenant }, {
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": buildPanelCookieHeader(token, new URL(req.url).protocol === "https:", DEFAULT_PANEL_TTL_MS / 1000),
    },
  });
}

export async function registerBusiness(req: Request): Promise<Response> {
  if (!sameOrigin(req)) return genericError(403, "forbidden");
  const input = await body(req);
  if (!input) return genericError(400, "invalid_json");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const name = typeof input.businessName === "string" ? input.businessName.trim() : "";
  if (!EMAIL_RE.test(email) || email.length > 254 || name.length < 2 || name.length > 120 ||
      password.length < 12 || password.length > 128 || Buffer.byteLength(password) > 256) {
    return genericError(422, "invalid_input");
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
    await db.query("INSERT INTO sales_workspaces (id,name) VALUES ($1,$2)", [tenant, name]);
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
    return issueCookie(tenant, id, req);
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return genericError(409, "email_exists");
    }
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
    if (!(await allowAuthAttempt(pool, LOGIN_PER_IP, clientIp(req))) ||
        !(await allowAuthAttempt(pool, LOGIN_PER_EMAIL, email))) {
      return genericError(429, "rate_limited");
    }
    const account = await findByEmail(email);
    dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
    const ok = await matchesPassword(password, account?.password_hash ?? await dummyHash);
    if (!account || !ok) {
      return genericError(401, "invalid_credentials");
    }
    if (!ensurePanelJtiStore()) return genericError(503, "database_unavailable");
    return issueCookie(account.tenant_id, account.id, req);
  } catch {
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
