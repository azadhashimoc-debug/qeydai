import { isSecureRequest } from "@/lib/api/panel-api";
import {
  DEFAULT_PANEL_TTL_MS, buildPanelCookieHeader, createPanelSessionToken, getPanelAuthConfig, isPanelJtiRevoked,
  readCookieValue, verifyPanelSessionToken,
} from "@/lib/api/panel-auth";
import { signInWithProfile } from "@/lib/auth/accounts";
import {
  OAUTH_COOKIE, exchangeCode, fetchProfile, isProvider, oauthCookieHeader, providerConfig, redirectUri, verifyOAuthState,
} from "@/lib/auth/oauth";
import { clientKey } from "@/lib/http/same-origin";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter({ max: 20, windowMs: 60_000, evictOnFull: true });

function back(lang: "az" | "en", result: "denied" | "error" | "email", secure: boolean) {
  return new Response(null, {
    status: 302,
    headers: {
      location: `/${lang}/login?oauth=${result}`,
      "set-cookie": oauthCookieHeader("", secure, 0),
      "cache-control": "no-store",
    },
  });
}

export async function GET(req: Request, context: RouteContext<"/api/auth/oauth/[provider]/callback">) {
  const { provider } = await context.params;
  if (!isProvider(provider)) return new Response(null, { status: 404 });
  const secure = isSecureRequest(req);
  const secret = getPanelAuthConfig().secret;
  const cfg = providerConfig(provider);
  const redirect = redirectUri(provider);
  if (!secret || !cfg || !redirect) return new Response(null, { status: 404 });

  const state = verifyOAuthState(readCookieValue(req.headers.get("cookie"), OAUTH_COOKIE), secret);
  const lang = state?.l ?? "az";
  if (!limiter.allow(clientKey(req))) return back(lang, "error", secure);

  const params = new URL(req.url).searchParams;
  if (params.get("error")) return back(lang, "denied", secure);
  const code = params.get("code");
  // The state must come from the cookie we signed for this very provider and match the returned value.
  if (!state || state.p !== provider || !code || params.get("state") !== state.s) return back(lang, "error", secure);

  const accessToken = await exchangeCode(provider, cfg, redirect, code, state.v);
  const profile = accessToken ? await fetchProfile(provider, accessToken) : null;
  if (!profile) return back(lang, "error", secure);
  if (provider === "google" && !profile.emailVerified) return back(lang, "email", secure);

  let signedIn;
  try {
    signedIn = await signInWithProfile(profile);
  } catch {
    console.error("oauth: sign-in failed");
    return back(lang, "error", secure);
  }

  const now = Date.now();
  const token = createPanelSessionToken(
    signedIn.tenantId, secret, now, DEFAULT_PANEL_TTL_MS, undefined, signedIn.memberId, signedIn.accountId,
  );
  // Same fail-closed check as the key login: the revocation backend must be reachable before a session is issued.
  const issued = verifyPanelSessionToken(token, secret, new Map(), now, { allowSocial: true });
  if (!issued) return back(lang, "error", secure);
  try {
    await isPanelJtiRevoked(issued.jti, now, issued.tenantId);
  } catch {
    return back(lang, "error", secure);
  }

  const headers = new Headers({ location: `/${lang}/panel`, "cache-control": "no-store" });
  headers.append("set-cookie", buildPanelCookieHeader(token, secure, DEFAULT_PANEL_TTL_MS / 1000));
  headers.append("set-cookie", oauthCookieHeader("", secure, 0));
  return new Response(null, { status: 302, headers });
}
