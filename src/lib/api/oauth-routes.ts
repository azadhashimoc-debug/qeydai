import { accountSessionCookieHeaders, findByEmail, hasStableSessionSecret, provisionOAuthAccount } from "./account-auth";
import { ensurePanelJtiStore } from "./instance";
import { getPanelAuthConfig, readCookieValue } from "./panel-auth";
import {
  buildAuthorizeUrl, createOAuthState, createPkcePair, fetchOAuthProfile, OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_MS, providerConfig, safeEqualText, signOAuthState, verifyOAuthState,
  type OAuthProvider,
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

    // Linking is by provider-verified email. An existing account with that email is reused.
    let account = await findByEmail(profile.email);
    if (!account) {
      const created = await provisionOAuthAccount(profile.email, profile.name);
      if (created && created !== "exists") {
        account = { tenant_id: created.tenantId, id: created.accountId, email: profile.email, password_hash: "" };
      } else if (created === "exists") {
        account = await findByEmail(profile.email);
      }
    }
    if (!account) return fail();

    const sessionCookies = accountSessionCookieHeaders(account.tenant_id, account.id, req);
    if (!sessionCookies) return fail();
    return redirectTo(`/${lang}/panel`, [clearState, ...sessionCookies]);
  } catch {
    return fail();
  }
}
