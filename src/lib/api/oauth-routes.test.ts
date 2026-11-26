import { beforeEach, describe, expect, it, vi } from "vitest";

const accountMocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findOAuthLinkState: vi.fn(),
  provisionOAuthAccount: vi.fn(),
  accountSessionCookieHeaders: vi.fn(),
  hasStableSessionSecret: vi.fn(() => true),
  linkOAuthProvider: vi.fn(async () => {}),
  verifyAccountPasswordById: vi.fn(),
}));
vi.mock("./account-auth", () => accountMocks);
vi.mock("./instance", async (importOriginal) => ({ ...(await importOriginal<typeof import("./instance")>()), ensurePanelJtiStore: () => true }));

import { getPanelAuthConfig } from "./panel-auth";
import { verifyOAuthState, OAUTH_STATE_COOKIE_NAME } from "./oauth";
import { finishLinkAccount, finishOAuth, startOAuth } from "./oauth-routes";
import { signLinkToken } from "./oauth";

const env = {
  QEYDAI_PANEL_SECRET: "x".repeat(32),
  GOOGLE_CLIENT_ID: "gid",
  GOOGLE_CLIENT_SECRET: "gsecret",
} as unknown as NodeJS.ProcessEnv;

function cookieFrom(setCookie: string | null): string {
  const m = /qeydai_oauth=([^;]+)/.exec(setCookie ?? "");
  if (!m) throw new Error("no state cookie");
  return m[1];
}

describe("OAuth start/finish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountMocks.hasStableSessionSecret.mockReturnValue(true);
    accountMocks.accountSessionCookieHeaders.mockReturnValue([
      "qeydai_panel=tok; HttpOnly", "qeydai_panel_hint=1",
    ]);
  });

  it("redirects to Google with a signed state cookie that matches the state parameter", () => {
    const res = startOAuth(new Request("https://panelim.az/api/panel/oauth/google/start?lang=en"), "google", env);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.hostname).toBe("accounts.google.com");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    const cookie = cookieFrom(res.headers.get("set-cookie"));
    const payload = verifyOAuthState(cookie, getPanelAuthConfig(env).secret!);
    expect(payload?.s).toBe(location.searchParams.get("state"));
    expect(payload?.l).toBe("en");
    expect(location.searchParams.get("redirect_uri")).toBe("https://panelim.az/api/panel/oauth/google/callback");
  });

  it("fails closed when the provider is not configured", () => {
    const res = startOAuth(new Request("https://panelim.az/api/panel/oauth/facebook/start"), "facebook", env);
    expect(res.headers.get("location")).toContain("/az/login?oauth_error=unavailable");
  });

  it("completes sign-in for an existing account matched by verified email", async () => {
    const start = startOAuth(new Request("https://panelim.az/api/panel/oauth/google/start?lang=az"), "google", env);
    const location = new URL(start.headers.get("location") ?? "");
    const state = location.searchParams.get("state")!;
    accountMocks.findByEmail.mockResolvedValue({ tenant_id: "biz_1", id: "a1", email: "a@b.co", password_hash: "" });
    accountMocks.findOAuthLinkState.mockResolvedValue({ oauth_providers: ["google"], password_login_enabled: true });
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u.includes("oauth2.googleapis.com")) return Response.json({ access_token: "t" });
      return Response.json({ email: "a@b.co", email_verified: true, name: "A" });
    }) as typeof fetch;
    const req = new Request(`https://panelim.az/api/panel/oauth/google/callback?code=abc&state=${state}`, {
      headers: { cookie: `${OAUTH_STATE_COOKIE_NAME}=${cookieFrom(start.headers.get("set-cookie"))}` },
    });
    const res = await finishOAuth(req, "google", env, fetchImpl);
    expect(res.headers.get("location")).toBe("/az/panel");
    expect(accountMocks.findByEmail).toHaveBeenCalledWith("a@b.co");
    expect(accountMocks.provisionOAuthAccount).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toContain("qeydai_panel=tok");
  });

  it("rejects a callback whose state does not match the cookie", async () => {
    const start = startOAuth(new Request("https://panelim.az/api/panel/oauth/google/start"), "google", env);
    const req = new Request("https://panelim.az/api/panel/oauth/google/callback?code=abc&state=forged", {
      headers: { cookie: `${OAUTH_STATE_COOKIE_NAME}=${cookieFrom(start.headers.get("set-cookie"))}` },
    });
    const res = await finishOAuth(req, "google", env, (async () => Response.json({})) as typeof fetch);
    expect(res.headers.get("location")).toBe("/az/login?oauth_error=1");
    expect(accountMocks.findByEmail).not.toHaveBeenCalled();
    expect(accountMocks.provisionOAuthAccount).not.toHaveBeenCalled();
  });

  it("sends a password account to the link step instead of signing in", async () => {
    const start = startOAuth(new Request("https://panelim.az/api/panel/oauth/google/start?lang=az"), "google", env);
    const state = new URL(start.headers.get("location") ?? "").searchParams.get("state")!;
    accountMocks.findByEmail.mockResolvedValue({ tenant_id: "biz_1", id: "a1", email: "a@b.co", password_hash: "x" });
    accountMocks.findOAuthLinkState.mockResolvedValue({ oauth_providers: [], password_login_enabled: true });
    const fetchImpl = (async (input: RequestInfo | URL) => String(input).includes("oauth2.googleapis.com")
      ? Response.json({ access_token: "t" })
      : Response.json({ email: "a@b.co", email_verified: true })) as typeof fetch;
    const req = new Request(`https://panelim.az/api/panel/oauth/google/callback?code=abc&state=${state}`, {
      headers: { cookie: `${OAUTH_STATE_COOKIE_NAME}=${cookieFrom(start.headers.get("set-cookie"))}` },
    });
    const res = await finishOAuth(req, "google", env, fetchImpl);
    expect(res.headers.get("location")).toMatch(/^\/az\/link-account\?t=/);
    expect(accountMocks.linkOAuthProvider).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie") ?? "").not.toContain("qeydai_panel=");
  });

  it("links the provider without a password when the account is already linked to it", async () => {
    const start = startOAuth(new Request("https://panelim.az/api/panel/oauth/google/start"), "google", env);
    const state = new URL(start.headers.get("location") ?? "").searchParams.get("state")!;
    accountMocks.findByEmail.mockResolvedValue({ tenant_id: "biz_1", id: "a1", email: "a@b.co", password_hash: "x" });
    accountMocks.findOAuthLinkState.mockResolvedValue({ oauth_providers: ["google"], password_login_enabled: true });
    const fetchImpl = (async (input: RequestInfo | URL) => String(input).includes("oauth2.googleapis.com")
      ? Response.json({ access_token: "t" })
      : Response.json({ email: "a@b.co", email_verified: true })) as typeof fetch;
    const req = new Request(`https://panelim.az/api/panel/oauth/google/callback?code=abc&state=${state}`, {
      headers: { cookie: `${OAUTH_STATE_COOKIE_NAME}=${cookieFrom(start.headers.get("set-cookie"))}` },
    });
    const res = await finishOAuth(req, "google", env, fetchImpl);
    expect(res.headers.get("location")).toBe("/az/panel");
    expect(accountMocks.linkOAuthProvider).not.toHaveBeenCalled();
  });

  it("links after the correct password, and refuses a wrong one", async () => {
    const token = signLinkToken({ t: "biz_" + "a".repeat(8) + "-" + "b".repeat(4) + "-" + "c".repeat(4) + "-" + "d".repeat(4) + "-" + "e".repeat(12), a: "f".repeat(8) + "-" + "1".repeat(4) + "-" + "2".repeat(4) + "-" + "3".repeat(4) + "-" + "4".repeat(12), p: "facebook", l: "en", x: Date.now() + 60_000 }, getPanelAuthConfig(env).secret!);
    const form = (password: string) => {
      const body = new URLSearchParams({ t: token, password });
      return new Request("https://panelim.az/api/panel/oauth/link", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" } });
    };
    accountMocks.verifyAccountPasswordById.mockResolvedValueOnce("ok");
    const ok = await finishLinkAccount(form("right-password-123"), env);
    expect(accountMocks.linkOAuthProvider).toHaveBeenCalledWith(expect.any(String), expect.any(String), "facebook");
    expect(ok.headers.get("location")).toBe("/en/panel");

    accountMocks.verifyAccountPasswordById.mockResolvedValueOnce("bad");
    const bad = await finishLinkAccount(form("wrong"), env);
    expect(bad.headers.get("location")).toContain("/en/link-account?t=");
    expect(bad.headers.get("location")).toContain("error=1");
    expect(accountMocks.linkOAuthProvider).toHaveBeenCalledTimes(1);
  });

  it("rejects a link request with a forged token", async () => {
    const body = new URLSearchParams({ t: "forged.token", password: "whatever-password" });
    const res = await finishLinkAccount(new Request("https://panelim.az/api/panel/oauth/link", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" } }), env);
    expect(res.headers.get("location")).toContain("oauth_error=1");
    expect(accountMocks.verifyAccountPasswordById).not.toHaveBeenCalled();
  });

  it("rejects a callback without a state cookie", async () => {
    const req = new Request("https://panelim.az/api/panel/oauth/google/callback?code=abc&state=s");
    const res = await finishOAuth(req, "google", env, (async () => Response.json({})) as typeof fetch);
    expect(res.headers.get("location")).toContain("oauth_error=1");
  });
});
