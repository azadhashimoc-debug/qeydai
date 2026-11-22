import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/accounts", () => ({
  signInWithProfile: vi.fn(async () => ({ accountId: "acc_1", tenantId: "ws_1", memberId: "m_1", created: true })),
}));

import { PANEL_COOKIE_NAME, setPanelJtiStore } from "@/lib/api/panel-auth";
import { signInWithProfile } from "@/lib/auth/accounts";
import { GET as callback } from "./callback/route";
import { GET as start } from "./start/route";

const SAVED = { ...process.env };
const ctx = (provider: string) => ({ params: Promise.resolve({ provider }) }) as never;
const realFetch = globalThis.fetch;

function cookieOf(res: Response, name: string): string {
  const all = res.headers.getSetCookie();
  const hit = all.find((c) => c.startsWith(`${name}=`));
  return hit ? hit.split(";")[0] : "";
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://panelim.az";
  process.env.GOOGLE_CLIENT_ID = "gid";
  process.env.GOOGLE_CLIENT_SECRET = "gsecret";
  process.env.QEYDAI_ADMIN_KEYS = JSON.stringify({ "a-long-admin-key-0123456789abcdef": "tenant_a" });
  process.env.QEYDAI_PANEL_SECRET = "panel-secret-0123456789abcdef0123456789";
  delete process.env.FACEBOOK_APP_ID;
  setPanelJtiStore({ revokePanelJti: async () => {}, isPanelJtiRevoked: async () => false });
  vi.mocked(signInWithProfile).mockClear();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...SAVED };
  setPanelJtiStore(null);
});

async function begin() {
  const res = await start(new Request("https://panelim.az/api/auth/oauth/google/start?lang=en"), ctx("google"));
  const url = new URL(res.headers.get("location")!);
  return { res, state: url.searchParams.get("state")!, cookie: cookieOf(res, "qeydai_oauth") };
}

describe("OAuth routes", () => {
  it("start redirects to Google with state and PKCE and sets a signed cookie", async () => {
    const { res, state, cookie } = await begin();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("accounts.google.com");
    expect(state.length).toBeGreaterThan(20);
    expect(cookie).toMatch(/^qeydai_oauth=.+\..+$/);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/);
  });

  it("start 404s for unknown or unconfigured providers", async () => {
    expect((await start(new Request("https://panelim.az/x"), ctx("twitter"))).status).toBe(404);
    expect((await start(new Request("https://panelim.az/x"), ctx("facebook"))).status).toBe(404);
  });

  it("callback signs the user in and sets a panel cookie", async () => {
    const { state, cookie } = await begin();
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: "g1", email: "a@b.az", email_verified: true, name: "A" }), { status: 200 })) as typeof fetch;
    const res = await callback(
      new Request(`https://panelim.az/api/auth/oauth/google/callback?code=abc&state=${state}`, { headers: { cookie } }),
      ctx("google"),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/en/panel");
    expect(cookieOf(res, PANEL_COOKIE_NAME)).toMatch(new RegExp(`^${PANEL_COOKIE_NAME}=.+\\..+$`));
    expect(signInWithProfile).toHaveBeenCalledWith(expect.objectContaining({ provider: "google", providerUserId: "g1" }));
  });

  it("callback rejects a wrong state, a missing cookie and a denied consent without signing in", async () => {
    const { cookie } = await begin();
    const wrong = await callback(
      new Request("https://panelim.az/api/auth/oauth/google/callback?code=abc&state=nope", { headers: { cookie } }), ctx("google"));
    expect(wrong.headers.get("location")).toBe("/en/login?oauth=error");
    const noCookie = await callback(
      new Request("https://panelim.az/api/auth/oauth/google/callback?code=abc&state=nope"), ctx("google"));
    expect(noCookie.headers.get("location")).toBe("/az/login?oauth=error");
    const denied = await callback(
      new Request("https://panelim.az/api/auth/oauth/google/callback?error=access_denied", { headers: { cookie } }), ctx("google"));
    expect(denied.headers.get("location")).toBe("/en/login?oauth=denied");
    expect(signInWithProfile).not.toHaveBeenCalled();
  });

  it("callback refuses a Google account whose e-mail is not verified", async () => {
    const { state, cookie } = await begin();
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: "g2", email: "x@y.az", email_verified: false }), { status: 200 })) as typeof fetch;
    const res = await callback(
      new Request(`https://panelim.az/api/auth/oauth/google/callback?code=abc&state=${state}`, { headers: { cookie } }), ctx("google"));
    expect(res.headers.get("location")).toBe("/en/login?oauth=email");
    expect(signInWithProfile).not.toHaveBeenCalled();
  });
});
