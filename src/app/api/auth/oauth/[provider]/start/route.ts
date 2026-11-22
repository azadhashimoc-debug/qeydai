import { isSecureRequest } from "@/lib/api/panel-api";
import { getPanelAuthConfig } from "@/lib/api/panel-auth";
import {
  OAUTH_STATE_TTL_MS, buildAuthorizeUrl, isProvider, newPkce, newState, oauthCookieHeader, providerConfig,
  redirectUri, signOAuthState,
} from "@/lib/auth/oauth";
import { clientKey } from "@/lib/http/same-origin";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter({ max: 30, windowMs: 60_000, evictOnFull: true });

// Starts the Google/Facebook sign-in: stores a signed state + PKCE verifier in a short-lived cookie, then redirects.
export async function GET(req: Request, context: RouteContext<"/api/auth/oauth/[provider]/start">) {
  const { provider } = await context.params;
  if (!isProvider(provider)) return new Response(null, { status: 404 });
  const cfg = providerConfig(provider);
  const redirect = redirectUri(provider);
  if (!cfg || !redirect) return new Response(null, { status: 404 });
  if (!limiter.allow(clientKey(req))) return new Response(null, { status: 429 });

  const secret = getPanelAuthConfig().secret;
  if (!secret) return new Response(null, { status: 503 });

  const lang = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "az";
  const state = newState();
  const { verifier, challenge } = newPkce();
  const cookie = signOAuthState({ p: provider, s: state, v: verifier, l: lang, exp: Date.now() + OAUTH_STATE_TTL_MS }, secret);

  return new Response(null, {
    status: 302,
    headers: {
      location: buildAuthorizeUrl(provider, cfg, redirect, state, challenge),
      "set-cookie": oauthCookieHeader(cookie, isSecureRequest(req), OAUTH_STATE_TTL_MS / 1000),
      "cache-control": "no-store",
    },
  });
}
