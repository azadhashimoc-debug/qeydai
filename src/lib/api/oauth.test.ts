import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl, createPkcePair, facebookGraphVersion, fetchOAuthProfile, isOAuthProvider,
  providerConfig, safeEqualText, signOAuthState, verifyOAuthState,
} from "./oauth";

const secret = randomBytes(32);
const cfg = { clientId: "cid", clientSecret: "csecret" };
const env = (o: Record<string, string>) => o as NodeJS.ProcessEnv;
const payload = { p: "google" as const, s: "state-1", v: "verifier-1", l: "az" as const, x: Date.now() + 60_000 };

describe("oauth helpers", () => {
  it("builds an S256 PKCE pair", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });

  it("round-trips a signed state cookie and rejects tampering, expiry and wrong secret", () => {
    const token = signOAuthState(payload, secret);
    expect(verifyOAuthState(token, secret)).toEqual(payload);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, v: "attacker" })).toString("base64url") + "." + sig;
    expect(verifyOAuthState(forged, secret)).toBeNull();
    expect(verifyOAuthState(token, randomBytes(32))).toBeNull();
    expect(verifyOAuthState(signOAuthState({ ...payload, x: 1 }, secret), secret)).toBeNull();
    expect(verifyOAuthState(body, secret)).toBeNull();
    expect(verifyOAuthState(null, secret)).toBeNull();
  });

  it("builds Google and Facebook authorize URLs with state and PKCE", () => {
    const google = new URL(buildAuthorizeUrl("google", cfg, "https://x/cb", "st", "ch", env({})));
    expect(google.origin + google.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    expect(google.searchParams.get("state")).toBe("st");
    const fb = new URL(buildAuthorizeUrl("facebook", cfg, "https://x/cb", "st", "ch", env({})));
    expect(fb.pathname).toBe("/v25.0/dialog/oauth");
    expect(fb.searchParams.get("code_challenge")).toBe("ch");
  });

  it("validates provider names, config and graph version", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("github")).toBe(false);
    expect(providerConfig("google", env({}))).toBeNull();
    expect(providerConfig("facebook", env({ FACEBOOK_APP_ID: "a", FACEBOOK_APP_SECRET: "b" }))).toEqual({ clientId: "a", clientSecret: "b" });
    expect(facebookGraphVersion(env({ FACEBOOK_GRAPH_VERSION: "evil/../x" }))).toBe("v25.0");
    expect(facebookGraphVersion(env({ FACEBOOK_GRAPH_VERSION: "v26.0" }))).toBe("v26.0");
    expect(safeEqualText("abc", "abc")).toBe(true);
    expect(safeEqualText("abc", "abd")).toBe(false);
  });
});

function fakeFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const key = url.origin + url.pathname;
    if (!(key in routes)) return new Response("nope", { status: 500 });
    return Response.json(routes[key]);
  }) as typeof fetch;
}

describe("fetchOAuthProfile", () => {
  it("accepts Google only with a verified email", async () => {
    const ok = fakeFetch({
      "https://oauth2.googleapis.com/token": { access_token: "t" },
      "https://openidconnect.googleapis.com/v1/userinfo": { email: "Ali@Example.com", email_verified: true, name: "Ali" },
    });
    await expect(fetchOAuthProfile("google", cfg, "c", "v", "https://x/cb", env({}), ok))
      .resolves.toEqual({ email: "ali@example.com", name: "Ali" });
    const unverified = fakeFetch({
      "https://oauth2.googleapis.com/token": { access_token: "t" },
      "https://openidconnect.googleapis.com/v1/userinfo": { email: "a@b.co", email_verified: false },
    });
    await expect(fetchOAuthProfile("google", cfg, "c", "v", "https://x/cb", env({}), unverified)).resolves.toBeNull();
  });

  it("returns null for Facebook without an email and sends the PKCE verifier", async () => {
    const seen: string[] = [];
    const f = (async (input: RequestInfo | URL) => {
      const u = String(input);
      seen.push(u);
      if (u.includes("/oauth/access_token")) return Response.json({ access_token: "t" });
      return Response.json({ name: "No Mail" });
    }) as typeof fetch;
    await expect(fetchOAuthProfile("facebook", cfg, "c", "ver", "https://x/cb", env({}), f)).resolves.toBeNull();
    expect(seen[0]).toContain("code_verifier=ver");
  });
});
