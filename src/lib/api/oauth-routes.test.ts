import { beforeEach, describe, expect, it, vi } from "vitest";

const accountMocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  provisionOAuthAccount: vi.fn(),
  accountSessionCookieHeaders: vi.fn(),
  hasStableSessionSecret: vi.fn(() => true),
}));
vi.mock("./account-auth", () => accountMocks);
vi.mock("./instance", async (importOriginal) => ({ ...(await importOriginal<typeof import("./instance")>()), ensurePanelJtiStore: () => true }));

import { getPanelAuthConfig } from "./panel-auth";
import { verifyOAuthState, OAUTH_STATE_COOKIE_NAME } from "./oauth";
import { finishOAuth, startOAuth } from "./oauth-routes";

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

  it("rejects a callback without a state cookie", async () => {
    const req = new Request("https://panelim.az/api/panel/oauth/google/callback?code=abc&state=s");
    const res = await finishOAuth(req, "google", env, (async () => Response.json({})) as typeof fetch);
    expect(res.headers.get("location")).toContain("oauth_error=1");
  });
});
