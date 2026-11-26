import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { parseKeys } from "./instance";

export const PANEL_COOKIE_NAME = "qeydai_panel";
/**
 * Non-HttpOnly companion cookie with no secret value. It only tells the panel UI that a
 * session may exist, so the client skips the /api/panel/auth probe (and its 401) when signed out.
 * Authorization still depends solely on the HttpOnly session cookie.
 */
export const PANEL_HINT_COOKIE_NAME = "qeydai_panel_hint";
export const DEFAULT_PANEL_TTL_MS = 8 * 3600 * 1000;

const MIN_EXPLICIT_SECRET_LENGTH = 24;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export type PanelJtiStore = {
  revokePanelJti: (jti: string, expMs: number, tenantId: string) => Promise<void>;
  isPanelJtiRevoked: (jti: string, nowMs: number, tenantId: string) => Promise<boolean>;
};

let panelJtiStore: PanelJtiStore | null = null;

/** Inject a persistent JTI store (SQLite/Postgres). Falls back to in-memory when unset. */
export function setPanelJtiStore(store: PanelJtiStore | null): void {
  panelJtiStore = store;
}

const MAX_REVOKED_JTIS = 10_000;
const revokedJtis = new Map<string, number>();

/** Memory fallback is limited to development and unit tests, never Vercel runtime. */
function requirePersistentRevocationInProduction(): void {
  if (process.env.VERCEL ||
      (process.env.NODE_ENV === "production" && process.env.QEYDAI_E2E_SQLITE !== "1")) {
    throw new Error("persistent_panel_jti_store_required");
  }
}

export async function revokePanelJti(jti: string, expMs: number, nowMs: number = Date.now(), tenantId = ""): Promise<void> {
  if (!jti || expMs <= nowMs) return;
  if (panelJtiStore) {
    await panelJtiStore.revokePanelJti(jti, expMs, tenantId);
    return;
  }
  requirePersistentRevocationInProduction();
  if (revokedJtis.size >= MAX_REVOKED_JTIS) {
    for (const [k, exp] of revokedJtis) {
      if (exp <= nowMs) revokedJtis.delete(k);
    }
    if (revokedJtis.size >= MAX_REVOKED_JTIS) {
      const oldest = revokedJtis.keys().next().value;
      if (oldest !== undefined) revokedJtis.delete(oldest);
    }
  }
  revokedJtis.set(`${tenantId}:${jti}`, expMs);
}

export async function isPanelJtiRevoked(jti: string, nowMs: number = Date.now(), tenantId = ""): Promise<boolean> {
  if (panelJtiStore) return panelJtiStore.isPanelJtiRevoked(jti, nowMs, tenantId);
  requirePersistentRevocationInProduction();
  const exp = revokedJtis.get(`${tenantId}:${jti}`);
  if (exp === undefined) return false;
  if (exp <= nowMs) {
    revokedJtis.delete(`${tenantId}:${jti}`);
    return false;
  }
  return true;
}

export type PanelSessionPayload = {
  tenantId: string;
  memberId: string;
  exp: number;
  jti: string;
};

type RawPanelTokenPayload = {
  t: string;
  iat: number;
  exp: number;
  jti: string;
  k?: string;
  m?: string;
};

function sha256(input: string): Buffer {
  return createHash("sha256").update(input, "utf8").digest();
}

/** Short non-secret fingerprint binding a session token to the specific admin key that issued it. */
export function adminKeyFingerprint(rawKey: string): string {
  return sha256(rawKey.trim()).toString("hex").slice(0, 16);
}

/**
 * Constant-time comparison of `rawKey` against every configured admin key.
 * Iterates through all entries without early exit and returns the matching tenant id, or null.
 */
export function authenticateAdminKey(rawKey: string, adminKeys: Record<string, string>): string | null {
  if (typeof rawKey !== "string") return null;
  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  const given = sha256(trimmed);
  let found: string | null = null;
  for (const [k, tenant] of Object.entries(adminKeys)) {
    const expected = sha256(k);
    if (timingSafeEqual(given, expected)) {
      found = tenant;
    }
  }
  return found;
}

/**
 * Derives the HMAC signing key for panel session cookies.
 * Returns null when neither an explicit secret nor administrator keys exist.
 * Uses `explicitSecret` when >= 24 characters; otherwise derives deterministically
 * from the sorted `adminKeys` map so there is never a static hardcoded fallback secret.
 */
export function derivePanelSecret(adminKeys: Record<string, string>, explicitSecret?: string): Buffer | null {
  const entries = Object.entries(adminKeys);
  const trimmedSecret = typeof explicitSecret === "string" ? explicitSecret.trim() : "";
  if (trimmedSecret.length >= MIN_EXPLICIT_SECRET_LENGTH) {
    return sha256(trimmedSecret);
  }
  if (entries.length === 0) return null;

  const sorted = entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return sha256(`qeydai-panel-v1:${JSON.stringify(sorted)}`);
}

export function createPanelSessionToken(
  tenantId: string,
  secret: Buffer,
  nowMs: number = Date.now(),
  ttlMs: number = DEFAULT_PANEL_TTL_MS,
  keyFingerprint?: string,
  memberId?: string,
): string {
  const payload: RawPanelTokenPayload = {
    t: tenantId,
    ...(memberId ? { m: memberId } : {}),
    iat: nowMs,
    exp: nowMs + ttlMs,
    jti: randomBytes(12).toString("base64url"),
    ...(keyFingerprint ? { k: keyFingerprint } : {}),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload, "utf8").digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyPanelSessionToken(
  token: string,
  secret: Buffer,
  allowed: Set<string> | Map<string, Set<string>>,
  nowMs: number = Date.now(),
): PanelSessionPayload | null {
  if (typeof token !== "string" || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSig] = parts;
  if (!BASE64URL_RE.test(encodedPayload) || !BASE64URL_RE.test(encodedSig)) return null;

  const expectedSig = createHmac("sha256", secret).update(encodedPayload, "utf8").digest();
  const givenSig = Buffer.from(encodedSig, "base64url");
  if (givenSig.length !== expectedSig.length || !timingSafeEqual(givenSig, expectedSig)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const rec = parsed as Record<string, unknown>;
  if (
    typeof rec.t !== "string" ||
    !rec.t ||
    typeof rec.iat !== "number" ||
    !Number.isFinite(rec.iat) ||
    typeof rec.exp !== "number" ||
    !Number.isFinite(rec.exp) ||
    typeof rec.jti !== "string" ||
    !rec.jti
  ) {
    return null;
  }

  if (rec.exp <= nowMs) return null;

  if (allowed instanceof Map) {
    if (typeof rec.k !== "string" || !rec.k) return null;
    if (!allowed.get(rec.t)?.has(rec.k)) return null;
  } else if (!allowed.has(rec.t)) {
    return null;
  }

  return { tenantId: rec.t, memberId: typeof rec.m === "string" ? rec.m : "", exp: rec.exp, jti: rec.jti };
}

export function buildPanelCookieHeader(token: string, secure: boolean, maxAgeSec: number): string {
  const maxAge = Math.max(0, Math.floor(maxAgeSec));
  return `${PANEL_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function clearPanelCookieHeader(secure: boolean): string {
  return `${PANEL_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function buildPanelHintCookieHeader(secure: boolean, maxAgeSec: number): string {
  const maxAge = Math.max(0, Math.floor(maxAgeSec));
  return `${PANEL_HINT_COOKIE_NAME}=1; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function clearPanelHintCookieHeader(secure: boolean): string {
  return `${PANEL_HINT_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader || !name) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key !== name) continue;
    const rawVal = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(rawVal);
    } catch {
      return rawVal;
    }
  }
  return null;
}

/** Reads QEYDAI_ADMIN_KEYS from environment without touching the enrollment database. */
export function getPanelAuthConfig(env: NodeJS.ProcessEnv = process.env): {
  adminKeys: Record<string, string>;
  allowedTenants: Set<string>;
  allowedKeysByTenant: Map<string, Set<string>>;
  secret: Buffer | null;
  /** Signing key for email/password account sessions. Only set from an explicit QEYDAI_PANEL_SECRET (>= 24 chars). */
  accountSecret?: Buffer | null;
} {
  const adminKeys = parseKeys(env.QEYDAI_ADMIN_KEYS, "QEYDAI_ADMIN_KEYS");
  const allowedTenants = new Set<string>();
  const allowedKeysByTenant = new Map<string, Set<string>>();
  for (const [key, tenant] of Object.entries(adminKeys)) {
    allowedTenants.add(tenant);
    let set = allowedKeysByTenant.get(tenant);
    if (!set) {
      set = new Set<string>();
      allowedKeysByTenant.set(tenant, set);
    }
    set.add(adminKeyFingerprint(key));
  }
  const secret = derivePanelSecret(adminKeys, env.QEYDAI_PANEL_SECRET);
  const explicit = (env.QEYDAI_PANEL_SECRET ?? "").trim();
  const accountSecret =
    explicit.length >= MIN_EXPLICIT_SECRET_LENGTH ? sha256(`qeydai-account-v1:${explicit}`) : null;
  return { adminKeys, allowedTenants, allowedKeysByTenant, secret, accountSecret };
}

/** Session token for an email/password account. Signed with a key separate from the admin-key tokens. */
export function createAccountSessionToken(
  tenantId: string,
  memberId: string,
  accountSecret: Buffer,
  nowMs: number = Date.now(),
  ttlMs: number = DEFAULT_PANEL_TTL_MS,
): string {
  const payload = { t: tenantId, m: memberId, a: 1, iat: nowMs, exp: nowMs + ttlMs, jti: randomBytes(12).toString("base64url") };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", accountSecret).update(encoded, "utf8").digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAccountSessionToken(
  token: string,
  accountSecret: Buffer,
  nowMs: number = Date.now(),
): PanelSessionPayload | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !BASE64URL_RE.test(parts[0]) || !BASE64URL_RE.test(parts[1])) return null;
  const expected = createHmac("sha256", accountSecret).update(parts[0], "utf8").digest();
  const given = Buffer.from(parts[1], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let rec: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    rec = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  if (
    rec.a !== 1 ||
    typeof rec.t !== "string" || !rec.t ||
    typeof rec.m !== "string" || !rec.m ||
    typeof rec.jti !== "string" || !rec.jti ||
    typeof rec.exp !== "number" || !Number.isFinite(rec.exp) || rec.exp <= nowMs
  ) {
    return null;
  }
  return { tenantId: rec.t, memberId: rec.m, exp: rec.exp, jti: rec.jti };
}

type VerifyConfig = ReturnType<typeof getPanelAuthConfig> | {
  secret: Buffer | null;
  allowedTenants: Set<string>;
  allowedKeysByTenant?: Map<string, Set<string>>;
  accountSecret?: Buffer | null;
};

/** Accepts an admin-key session or an email/password account session. */
export function verifyAnyPanelToken(token: string, config: VerifyConfig, nowMs: number = Date.now()): PanelSessionPayload | null {
  if (config.secret && config.allowedTenants.size > 0) {
    const allowed = config.allowedKeysByTenant ?? config.allowedTenants;
    const payload = verifyPanelSessionToken(token, config.secret, allowed, nowMs);
    if (payload) return payload;
  }
  if (config.accountSecret) return verifyAccountSessionToken(token, config.accountSecret, nowMs);
  return null;
}
