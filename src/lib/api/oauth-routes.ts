import {
  accountSessionCookieHeaders, findByEmail, hasStableSessionSecret, linkOAuthProvider,
  provisionOAuthAccount, verifyAccountPasswordById,
} from "./account-auth";
import { ensurePanelJtiStore } from "./instance";
import { getPanelAuthConfig, readCookieValue } from "./panel-auth";
import {
  buildAuthorizeUrl, createOAuthState, createPkcePair, fetchOAuthProfile,
  OAUTH_STATE_COOKIE_NAME, OAUTH_STATE_TTL_MS, providerConfig, safeEqualText, signLinkToken,
  signOAuthState, verifyLinkToken, verifyOAuthState, type OAuthProvider,
} from "./oauth";

type Lang = "az" | "en";
const STATE_COOKIE_PATH = "/api/panel/oauth";

function langFrom(value: string | null): Lang {
  return value === "en" ? "en" : "az";
}

function redirectTo(location: string, setCookies: string[] = []): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function stateCookie(value: string, secure: boolean, maxAgeSec: number): string {
  return `${OAUTH_STATE_COOKIE_NAME}=${value}; HttpOnly; Path=${STATE_COOKIE_PATH}; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

/** Step 1: sets a signed state + PKCE cookie and sends the browser to the provider's consent screen. */
export function startOAuth(req: Request, provider: OAuthProvider, env: NodeJS.ProcessEnv = process.env): Response {
  const url = new URL(req.url);
  const secure = url.protocol === "https:";
  const lang = langFrom(url.searchParams.get("lang"));
  const fail = () => redirectTo(`/${lang}/login?oauth_error=unavailable`);
  const cfg = providerConfig(provider, env);
  const secret = getPanelAuthConfig(env).secret;
  if (!cfg || !secret || !hasStableSessionSecret()) return fail();

  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();
  const cookieValue = signOAuthState(
    { p: provider, s: state, v: verifier, l: lang, x: Date.now() + OAUTH_STATE_TTL_MS },
    secret,
  );
  const redirectUri = `${url.origin}/api/panel/oauth/${provider}/callback`;
  const authorize = buildAuthorizeUrl(provider, cfg, redirectUri, state, challenge, env);
  return redirectTo(authorize, [stateCookie(cookieValue, secure, Math.floor(OAUTH_STATE_TTL_MS / 1000))]);
}

/** Step 2: verifies state, exchanges the code, links or creates the account by verified email, signs in. */
export async function finishOAuth(
  req: Request,
  provider: OAuthProvider,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(req.url);
  const secure = url.protocol === "https:";
  const clearState = stateCookie("", secure, 0);
  const secret = getPanelAuthConfig(env).secret;
  const payload = secret
    ? verifyOAuthState(readCookieValue(req.headers.get("cookie"), OAUTH_STATE_COOKIE_NAME), secret)
    : null;
  const lang: Lang = payload?.l ?? "az";
  const fail = () => redirectTo(`/${lang}/login?oauth_error=1`, [clearState]);

  try {
    const state = url.searchParams.get("state") ?? "";
    const code = url.searchParams.get("code") ?? "";
    if (!payload || payload.p !== provider || !code || code.length > 2048 || !safeEqualText(state, payload.s)) {
      return fail();
    }
    const cfg = providerConfig(provider, env);
    if (!cfg || !hasStableSessionSecret() || !ensurePanelJtiStore()) return fail();

    const redirectUri = `${url.origin}/api/panel/oauth/${provider}/callback`;
    const profile = await fetchOAuthProfile(provider, cfg, code, payload.v, redirectUri, env, fetchImpl);
    if (!profile) return fail();

    // Matching is by provider-verified email. An account that already signed in with this provider,
    // or was created by OAuth, is used directly. A password account needs its password first.
    let account = await findByEmail(profile.email);
    if (!account) {
      const created = await provisionOAuthAccount(profile.email, profile.name, provider);
      if (created && created !== "exists") {
        account = {
          tenant_id: created.tenantId, id: created.accountId, email: profile.email, password_hash: "",
          oauth_providers: [provider], password_login_enabled: false,
        };
      } else if (created === "exists") {
        account = await findByEmail(profile.email);
      }
    }
    if (!account) return fail();

    const linkedAlready = account.oauth_providers.includes(provider);
    if (!linkedAlready && account.password_login_enabled) {
      if (!secret) return fail();
      const token = signLinkToken({
        t: account.tenant_id, a: account.id, p: provider, l: lang, x: Date.now() + OAUTH_STATE_TTL_MS,
      }, secret);
      return redirectTo(`/${lang}/link-account?t=${encodeURIComponent(token)}`, [clearState]);
    }
    if (!linkedAlready) await linkOAuthProvider(account.tenant_id, account.id, provider);

    const sessionCookies = accountSessionCookieHeaders(account.tenant_id, account.id, req);
    if (!sessionCookies) return fail();
    return redirectTo(`/${lang}/panel`, [clearState, ...sessionCookies]);
  } catch {
    return fail();
  }
}

/**
 * Step 3 (password accounts only): the user confirms this account's password, then the provider is linked
 * and the session starts. The link token is the only thing that identifies the account.
 */
export async function finishLinkAccount(req: Request, env: NodeJS.ProcessEnv = process.env): Promise<Response> {
  const form = await req.formData().catch(() => null);
  const token = typeof form?.get("t") === "string" ? String(form.get("t")) : null;
  const password = typeof form?.get("password") === "string" ? String(form.get("password")) : "";
  const secret = getPanelAuthConfig(env).secret;
  const payload = secret ? verifyLinkToken(token, secret) : null;
  if (!payload || !secret) return redirectTo("/az/login?oauth_error=1");
  const lang = payload.l;
  const back = `/${lang}/link-account?t=${encodeURIComponent(token ?? "")}`;
  try {
    const result = await verifyAccountPasswordById(payload.t, payload.a, password);
    if (result === "limited") return redirectTo(`${back}&error=limited`);
    if (result !== "ok") return redirectTo(`${back}&error=1`);
    await linkOAuthProvider(payload.t, payload.a, payload.p);
    const sessionCookies = accountSessionCookieHeaders(payload.t, payload.a, req);
    if (!sessionCookies) return redirectTo(`/${lang}/login?oauth_error=1`);
    return redirectTo(`/${lang}/panel`, sessionCookies);
  } catch {
    return redirectTo(`/${lang}/login?oauth_error=1`);
  }
}
