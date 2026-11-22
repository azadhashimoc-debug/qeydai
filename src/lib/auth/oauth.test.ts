import { describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl, enabledProviders, exchangeCode, fetchProfile, newPkce, providerConfig, redirectUri,
  signOAuthState, verifyOAuthState,
} from "./oauth";
import {
  createPanelSessionToken, verifyPanelSessionToken,
} from "@/lib/api/panel-auth";

const env = {
  NEXT_PUBLIC_SITE_URL: "https://panelim.az",
  GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsecret",
  FACEBOOK_APP_ID: "fid", FACEBOOK_APP_SECRET: "fsecret",
};
const secret = Buffer.from("test-secret-0123456789abcdef0123");

describe("provider configuration", () => {
  it("enables a provider only with id, secret and an https site URL", () => {
    expect(enabledProviders(env)).toEqual({ google: true, facebook: true });
    expect(enabledProviders({ ...env, GOOGLE_CLIENT_SECRET: "" }).google).toBe(false);
    expect(enabledProviders({ ...env, NEXT_PUBLIC_SITE_URL: undefined })).toEqual({ google: false, facebook: false });
    expect(enabledProviders({ ...env, NEXT_PUBLIC_SITE_URL: "http://panelim.az" }).google).toBe(false);
    expect(enabledProviders({ ...env, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).google).toBe(true);
  });
  it("builds a fixed callback URL from the site URL", () => {
    expect(redirectUri("google", env)).toBe("https://panelim.az/api/auth/oauth/google/callback");
  });
});

describe("state cookie", () => {
  const state = { p: "google" as const, s: "st", v: "ver", l: "az" as const, exp: Date.now() + 60_000 };
  it("round-trips and rejects tampering, a wrong secret and expiry", () => {
    const cookie = signOAuthState(state, secret);
    expect(verifyOAuthState(cookie, secret)).toEqual(state);
    expect(verifyOAuthState(cookie.replace(/.$/, (c) => (c === "A" ? "B" : "A")), secret)).toBeNull();
    expect(verifyOAuthState(cookie, Buffer.from("another-secret-0123456789abcdef01"))).toBeNull();
    expect(verifyOAuthState(cookie, secret, state.exp + 1)).toBeNull();
    expect(verifyOAuthState(null, secret)).toBeNull();
    expect(verifyOAuthState("garbage", secret)).toBeNull();
  });
});

describe("authorize URL", () => {
  it("includes PKCE, state and the provider scopes", () => {
    const { challenge } = newPkce();
    const google = new URL(buildAuthorizeUrl("google", providerConfig("google", env)!, "https://x/cb", "st", challenge));
    expect(google.origin + google.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    expect(google.searchParams.get("state")).toBe("st");
    expect(google.searchParams.get("scope")).toContain("email");
    const fb = new URL(buildAuthorizeUrl("facebook", providerConfig("facebook", env)!, "https://x/cb", "st", challenge));
    expect(fb.hostname).toBe("www.facebook.com");
    expect(fb.searchParams.get("scope")).toBe("email,public_profile");
  });
});

describe("token exchange and profile", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  it("returns the access token and a Google profile with verification flag", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ access_token: "tok" }))
      .mockResolvedValueOnce(json({ sub: "123", email: "a@b.az", email_verified: true, name: " Aysel " }));
    const token = await exchangeCode("google", providerConfig("google", env)!, "https://x/cb", "code", "ver", fetchImpl);
    expect(token).toBe("tok");
    const body = fetchImpl.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("code_verifier")).toBe("ver");
    const profile = await fetchProfile("google", "tok", fetchImpl);
    expect(profile).toEqual({ provider: "google", providerUserId: "123", email: "a@b.az", emailVerified: true, name: "Aysel" });
  });
  it("handles a Facebook profile without e-mail", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ id: "77", name: "Nigar" }));
    const profile = await fetchProfile("facebook", "tok", fetchImpl);
    expect(profile).toMatchObject({ providerUserId: "77", email: null, emailVerified: false });
  });
  it("returns null on provider errors instead of throwing", async () => {
    const failing = vi.fn().mockResolvedValue(json({ error: "x" }, 400));
    expect(await exchangeCode("google", providerConfig("google", env)!, "https://x/cb", "c", "v", failing)).toBeNull();
    expect(await fetchProfile("facebook", "t", failing)).toBeNull();
    const broken = vi.fn().mockRejectedValue(new Error("network"));
    expect(await fetchProfile("google", "t", broken)).toBeNull();
  });
});

describe("social session tokens", () => {
  const allowed = new Map([["tenant_a", new Set(["fp1"])]]);
  const now = Date.now();
  it("are accepted only when the caller opts in and the token names account and member", () => {
    const social = createPanelSessionToken("ws_new", secret, now, 60_000, undefined, "m_1", "acc_1");
    expect(verifyPanelSessionToken(social, secret, allowed, now)).toBeNull();
    expect(verifyPanelSessionToken(social, secret, allowed, now, { allowSocial: true })).toMatchObject({
      tenantId: "ws_new", memberId: "m_1", social: true,
    });
    const noMember = createPanelSessionToken("ws_new", secret, now, 60_000, undefined, undefined, "acc_1");
    expect(verifyPanelSessionToken(noMember, secret, allowed, now, { allowSocial: true })).toBeNull();
  });
  it("do not weaken admin-key sessions", () => {
    const admin = createPanelSessionToken("tenant_a", secret, now, 60_000, "fp1");
    expect(verifyPanelSessionToken(admin, secret, allowed, now, { allowSocial: true })).toMatchObject({ tenantId: "tenant_a", social: false });
    const wrongKey = createPanelSessionToken("tenant_a", secret, now, 60_000, "other");
    expect(verifyPanelSessionToken(wrongKey, secret, allowed, now, { allowSocial: true })).toBeNull();
    // a token that carries an admin-key fingerprint is never treated as social
    const both = createPanelSessionToken("ws_x", secret, now, 60_000, "other", "m_1", "acc_1");
    expect(verifyPanelSessionToken(both, secret, allowed, now, { allowSocial: true })).toBeNull();
  });
});
