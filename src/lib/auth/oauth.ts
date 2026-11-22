import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Google / Facebook OAuth 2.0 authorization-code flow with PKCE. No third-party SDK.
// Secrets come only from the environment and are never logged.

export type Provider = "google" | "facebook";
export const PROVIDERS: readonly Provider[] = ["google", "facebook"];
export const OAUTH_COOKIE = "qeydai_oauth";
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type Env = Record<string, string | undefined>;

export function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

export type ProviderConfig = { clientId: string; clientSecret: string };

/** A provider is enabled only when both its id and secret are set and the site URL is known. */
export function providerConfig(provider: Provider, env: Env = process.env): ProviderConfig | null {
  if (!siteUrl(env)) return null;
  const clientId = provider === "google" ? env.GOOGLE_CLIENT_ID : env.FACEBOOK_APP_ID;
  const clientSecret = provider === "google" ? env.GOOGLE_CLIENT_SECRET : env.FACEBOOK_APP_SECRET;
  if (!clientId?.trim() || !clientSecret?.trim()) return null;
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

export function enabledProviders(env: Env = process.env): Record<Provider, boolean> {
  return { google: providerConfig("google", env) !== null, facebook: providerConfig("facebook", env) !== null };
}

export function siteUrl(env: Env = process.env): string | null {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function redirectUri(provider: Provider, env: Env = process.env): string | null {
  const base = siteUrl(env);
  return base ? `${base}/api/auth/oauth/${provider}/callback` : null;
}

// ---- state cookie (CSRF + PKCE verifier), HMAC-signed so it cannot be forged or tampered with ----

export type OAuthState = { p: Provider; s: string; v: string; l: "az" | "en"; exp: number };

const b64 = (buf: Buffer) => buf.toString("base64url");
const sign = (payload: string, secret: Buffer) => createHmac("sha256", secret).update(payload, "utf8").digest("base64url");

export function newPkce(): { verifier: string; challenge: string } {
  const verifier = b64(randomBytes(32));
  return { verifier, challenge: b64(createHash("sha256").update(verifier).digest()) };
}

export function newState(): string {
  return b64(randomBytes(24));
}

export function signOAuthState(state: OAuthState, secret: Buffer): string {
  const payload = b64(Buffer.from(JSON.stringify(state), "utf8"));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyOAuthState(cookie: string | null, secret: Buffer, nowMs: number = Date.now()): OAuthState | null {
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<OAuthState>;
    if (
      typeof value.p !== "string" || !isProvider(value.p) ||
      typeof value.s !== "string" || !value.s ||
      typeof value.v !== "string" || !value.v ||
      (value.l !== "az" && value.l !== "en") ||
      typeof value.exp !== "number" || value.exp <= nowMs
    ) return null;
    return { p: value.p, s: value.s, v: value.v, l: value.l, exp: value.exp };
  } catch {
    return null;
  }
}

export function oauthCookieHeader(value: string, secure: boolean, maxAgeSec: number): string {
  return `${OAUTH_COOKIE}=${value}; HttpOnly; Path=/api/auth/oauth; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAgeSec))}${secure ? "; Secure" : ""}`;
}

// ---- provider calls ----

export function buildAuthorizeUrl(provider: Provider, cfg: ProviderConfig, redirect: string, state: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirect,
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
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export type Profile = {
  provider: Provider | "email";
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
};

const TIMEOUT_MS = 8000;

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  if (!res.ok) return null;
  try {
    const data: unknown = await res.json();
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Exchanges the authorization code for an access token. Returns null on any failure. */
export async function exchangeCode(
  provider: Provider, cfg: ProviderConfig, redirect: string, code: string, verifier: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    let res: Response;
    if (provider === "google") {
      res = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirect,
          grant_type: "authorization_code", code_verifier: verifier,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } else {
      const params = new URLSearchParams({
        client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: redirect, code, code_verifier: verifier,
      });
      res = await fetchImpl(`https://graph.facebook.com/v21.0/oauth/access_token?${params}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    }
    const data = await readJson(res);
    const token = data?.access_token;
    return typeof token === "string" && token ? token : null;
  } catch {
    return null;
  }
}

export async function fetchProfile(provider: Provider, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<Profile | null> {
  try {
    if (provider === "google") {
      const res = await fetchImpl("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = await readJson(res);
      if (!data || typeof data.sub !== "string" || !data.sub) return null;
      return {
        provider,
        providerUserId: data.sub,
        email: typeof data.email === "string" ? data.email : null,
        emailVerified: data.email_verified === true,
        name: typeof data.name === "string" ? data.name.trim().slice(0, 120) : "",
      };
    }
    const res = await fetchImpl(
      `https://graph.facebook.com/v21.0/me?${new URLSearchParams({ fields: "id,name,email", access_token: accessToken })}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    const data = await readJson(res);
    if (!data || typeof data.id !== "string" || !data.id) return null;
    return {
      provider,
      providerUserId: data.id,
      email: typeof data.email === "string" ? data.email : null,
      // Facebook only returns an e-mail it has confirmed.
      emailVerified: typeof data.email === "string",
      name: typeof data.name === "string" ? data.name.trim().slice(0, 120) : "",
    };
  } catch {
    return null;
  }
}
