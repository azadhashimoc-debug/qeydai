import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/email-login", () => ({
  createLoginToken: vi.fn(async () => "raw-token-value-0123456789abcdef0123456789"),
  consumeLoginToken: vi.fn(async (raw: string) => (raw === "good-token-0123456789abcdef0123456789" ? "owner@example.az" : null)),
}));
vi.mock("@/lib/auth/accounts", () => ({
  signInWithProfile: vi.fn(async () => ({ accountId: "acc_1", tenantId: "ws_1", memberId: "m_1", created: true })),
}));

import { PANEL_COOKIE_NAME, setPanelJtiStore } from "@/lib/api/panel-auth";
import { signInWithProfile } from "@/lib/auth/accounts";
import { consumeLoginToken, createLoginToken } from "@/lib/auth/email-login";
import { POST as request } from "./request/route";
import { POST as verify } from "./verify/route";

const SAVED = { ...process.env };
const realFetch = globalThis.fetch;
let ip = 0;
const post = (url: string, body: unknown, extra: Record<string, string> = {}) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}`, ...extra },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://panelim.az";
  process.env.RESEND_API_KEY = "re_key";
  process.env.EMAIL_FROM = "panelim.az <noreply@panelim.az>";
  process.env.QEYDAI_DATABASE_URL = "postgresql://unused";
  process.env.TRUST_PROXY = "x-forwarded-for";
  process.env.QEYDAI_ADMIN_KEYS = JSON.stringify({ "a-long-admin-key-0123456789abcdef": "tenant_a" });
  process.env.QEYDAI_PANEL_SECRET = "panel-secret-0123456789abcdef0123456789";
  setPanelJtiStore({ revokePanelJti: async () => {}, isPanelJtiRevoked: async () => false });
  vi.mocked(createLoginToken).mockClear();
  vi.mocked(signInWithProfile).mockClear();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...SAVED };
  setPanelJtiStore(null);
});

describe("POST /api/auth/email/request", () => {
  it("mails a link and answers the same way for any address", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = fetchSpy as typeof fetch;
    const res = await request(post("https://panelim.az/api/auth/email/request", { email: "New@Example.az", lang: "en" }));
    expect(res.status).toBe(200);
    expect(createLoginToken).toHaveBeenCalledWith("new@example.az");
    const sent = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(sent.to).toEqual(["new@example.az"]);
    expect(sent.text).toContain("https://panelim.az/en/login/confirm?token=raw-token-value");
  });

  it("rejects bad input, cross-site posts, and a disabled or unconfigured setup", async () => {
    expect((await request(post("https://panelim.az/api/auth/email/request", { email: "nope" }))).status).toBe(422);
    expect((await request(post("https://panelim.az/api/auth/email/request", "{bad"))).status).toBe(400);
    expect((await request(post("https://panelim.az/api/auth/email/request", { email: "a@b.az" }, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    delete process.env.RESEND_API_KEY;
    expect((await request(post("https://panelim.az/api/auth/email/request", { email: "a@b.az" }))).status).toBe(404);
    expect(createLoginToken).not.toHaveBeenCalled();
  });

  it("limits repeated requests for the same address", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 })) as typeof fetch;
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) {
      codes.push((await request(post("https://panelim.az/api/auth/email/request", { email: "limit@example.az" }))).status);
    }
    expect(codes).toEqual([200, 200, 200, 429, 429]);
  });

  it("reports a send failure instead of pretending it worked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 500 })) as typeof fetch;
    expect((await request(post("https://panelim.az/api/auth/email/request", { email: "fail@example.az" }))).status).toBe(502);
  });
});

describe("POST /api/auth/email/verify", () => {
  it("signs in with a valid token and sets the panel cookie", async () => {
    const res = await verify(post("https://panelim.az/api/auth/email/verify", { token: "good-token-0123456789abcdef0123456789" }));
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().some((c) => c.startsWith(`${PANEL_COOKIE_NAME}=`))).toBe(true);
    expect(signInWithProfile).toHaveBeenCalledWith(expect.objectContaining({ provider: "email", providerUserId: "owner@example.az" }));
  });

  it("refuses unknown, used or malformed tokens without signing anyone in", async () => {
    const res = await verify(post("https://panelim.az/api/auth/email/verify", { token: "unknown-token-0123456789abcdef012345" }));
    expect(res.status).toBe(400);
    expect(res.headers.getSetCookie()).toHaveLength(0);
    expect((await verify(post("https://panelim.az/api/auth/email/verify", { token: 5 }))).status).toBe(400);
    expect(signInWithProfile).not.toHaveBeenCalled();
    expect(consumeLoginToken).toHaveBeenCalled();
  });
});
