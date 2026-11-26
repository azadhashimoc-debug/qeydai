import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type OAuthProvider = "google" | "facebook";
export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ["google", "facebook"];
export const OAUTH_STATE_COOKIE_NAME = "qeydai_oauth";
export const OAUTH_STATE_TTL_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 8000;
const GRAPH_VERSION_RE = /^v\d+\.\d+$/;
const DEFAULT_GRAPH_VERSION = "v25.0";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export type ProviderConfig = { clientId: string; clientSecret: string };

/** Null when the provider's env vars are missing, so the button fails closed instead of erroring. */
export function providerConfig(provider: OAuthProvider, env: NodeJS.ProcessEnv = process.env): ProviderConfig | null {
  const [id, secret] = provider === "google"
    ? [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET]
    : [env.FACEBOOK_APP_ID, env.FACEBOOK_APP_SECRET];
  const clientId = id?.trim() ?? "";
  const clientSecret = secret?.trim() ?? "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function facebookGraphVersion(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.FACEBOOK_GRAPH_VERSION?.trim() ?? "";
  return GRAPH_VERSION_RE.test(value) ? value : DEFAULT_GRAPH_VERSION;
}

/** PKCE (RFC 7636): 256-bit verifier, S256 challenge. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier, "utf8").digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export type OAuthStatePayload = {
  p: OAuthProvider;
  s: string;
  v: string;
  l: "az" | "en";
  x: number;
};

function sign(encoded: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(encoded, "utf8").digest("base64url");
}

/** The state cookie holds the state, PKCE verifier and locale, signed so it cannot be forged. */
export function signOAuthState(payload: OAuthStatePayload, secret: Buffer): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyOAuthState(token: string | null, secret: Buffer, nowMs: number = Date.now()): OAuthStatePayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const expected = Buffer.from(sign(parts[0], secret), "base64url");
  const given = Buffer.from(parts[1], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const rec = parsed as Record<string, unknown>;
  if (typeof rec.p !== "string" || !isOAuthProvider(rec.p)) return null;
  if (typeof rec.s !== "string" || typeof rec.v !== "string" || (rec.l !== "az" && rec.l !== "en")) return null;
  if (typeof rec.x !== "number" || rec.x <= nowMs) return null;
  return { p: rec.p, s: rec.s, v: rec.v, l: rec.l, x: rec.x };
}

export function safeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  cfg: ProviderConfig,
  redirectUri: string,
  state: string,
  challenge: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  if (provider === "google") {
    params.set("scope", "openid email profile");
    params.set("prompt", "select_account");
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  params.set("scope", "email,public_profile");
  return `https://www.facebook.com/${facebookGraphVersion(env)}/dialog/oauth?${params}`;
}

export type OAuthProfile = { email: string; name: string };

async function fetchJson(fetchImpl: typeof fetch, url: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "error" });
  if (!res.ok) throw new Error("oauth_upstream_" + res.status);
  return res.json();
}

function profileFrom(email: unknown, name: unknown): OAuthProfile | null {
  if (typeof email !== "string") return null;
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) return null;
  return { email: cleanEmail, name: typeof name === "string" ? name.trim() : "" };
}

/**
 * Exchanges the authorization code (with the PKCE verifier) and reads the verified profile.
 * Returns null when the provider does not supply a usable, verified email.
 */
export async function fetchOAuthProfile(
  provider: OAuthProvider,
  cfg: ProviderConfig,
  code: string,
  verifier: string,
  redirectUri: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<OAuthProfile | null> {
  if (provider === "google") {
    const body = new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    });
    const token = await fetchJson(fetchImpl, "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }) as { access_token?: unknown };
    if (typeof token.access_token !== "string") return null;
    const info = await fetchJson(fetchImpl, "https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${token.access_token}` },
    }) as { email?: unknown; email_verified?: unknown; name?: unknown };
    if (info.email_verified !== true && info.email_verified !== "true") return null;
    return profileFrom(info.email, info.name);
  }

  const base = `https://graph.facebook.com/${facebookGraphVersion(env)}`;
  const tokenUrl = new URL(`${base}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  }).toString();
  const token = await fetchJson(fetchImpl, tokenUrl.toString()) as { access_token?: unknown };
  if (typeof token.access_token !== "string") return null;
  const me = await fetchJson(fetchImpl, `${base}/me?fields=name,email`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  }) as { email?: unknown; name?: unknown };
  return profileFrom(me.email, me.name);
}

/** Link token: proves the provider's verified email matched this existing account. Valid 10 minutes. */
export type LinkTokenPayload = { t: string; a: string; p: OAuthProvider; l: "az" | "en"; x: number };

export function signLinkToken(payload: LinkTokenPayload, secret: Buffer): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyLinkToken(token: string | null, secret: Buffer, nowMs: number = Date.now()): LinkTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const expected = Buffer.from(sign(parts[0], secret), "base64url");
  const given = Buffer.from(parts[1], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const rec = parsed as Record<string, unknown>;
  if (typeof rec.t !== "string" || !/^biz_[a-f0-9-]{36}$/.test(rec.t)) return null;
  if (typeof rec.a !== "string" || !/^[a-f0-9-]{36}$/.test(rec.a)) return null;
  if (typeof rec.p !== "string" || !isOAuthProvider(rec.p)) return null;
  if (rec.l !== "az" && rec.l !== "en") return null;
  if (typeof rec.x !== "number" || rec.x <= nowMs) return null;
  return { t: rec.t, a: rec.a, p: rec.p, l: rec.l, x: rec.x };
}
