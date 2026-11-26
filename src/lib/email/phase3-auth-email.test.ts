import { describe, expect, it, vi } from "vitest";
import {
  buildExistingAccountNoticeMessage,
  buildPasswordResetMessage,
  buildVerifyEmailMessage,
} from "@/app/[lang]/dictionaries/email-templates";
import {
  generateRawAccountToken,
  hashAccountToken,
  isValidAccountTokenFormat,
} from "@/lib/api/account-tokens";
import { getEmailFromAddress, isEmailConfigured, sendTransactionalEmail } from "@/lib/email/resend";
import { buildCspHeader, generateCspNonce, isNonceCspPath } from "@/lib/http/csp";

describe("Phase 3: Resend email client & templates", () => {
  it("skips cleanly when RESEND_API_KEY is unset", async () => {
    expect(isEmailConfigured({})).toBe(false);
    expect(getEmailFromAddress({})).toBe("panelim.az <noreply@panelim.az>");
    const res = await sendTransactionalEmail({
      to: "user@example.com",
      subject: "Hello",
      text: "Body",
      html: "<p>Body</p>",
      env: {},
    });
    expect(res).toEqual({ ok: false, skipped: true, reason: "email_not_configured" });
  });

  it("posts JSON payload to Resend API when configured", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    ) as unknown as typeof fetch;

    const env = {
      RESEND_API_KEY: "re_test_123",
      QEYDAI_EMAIL_FROM: "Panelim <hello@panelim.az>",
    };
    expect(isEmailConfigured(env)).toBe(true);
    const res = await sendTransactionalEmail({
      to: "owner@example.com",
      subject: "Verify",
      text: "Click link",
      html: "<p>Click link</p>",
      env,
      fetchImpl: fetchMock,
    });
    expect(res).toEqual({ ok: true, id: "email_123" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_test_123");
    const payload = JSON.parse(String(init.body)) as { from: string; to: string[]; subject: string };
    expect(payload.from).toBe("Panelim <hello@panelim.az>");
    expect(payload.to).toEqual(["owner@example.com"]);
  });

  it("returns error reason on non-2xx Resend response", async () => {
    const fetchMock = vi.fn(async () => new Response("rate limited", { status: 429 })) as unknown as typeof fetch;
    const res = await sendTransactionalEmail({
      to: "owner@example.com",
      subject: "Verify",
      text: "Click",
      html: "<p>Click</p>",
      env: { RESEND_API_KEY: "re_test" },
      fetchImpl: fetchMock,
    });
    expect(res).toEqual({ ok: false, reason: "resend_http_429" });
  });

  it("renders AZ and EN transactional templates with HTML-escaped links", () => {
    const url = "https://panelim.az/az/verify-email?token=abc&next=1";
    const azVerify = buildVerifyEmailMessage("az", url);
    const enVerify = buildVerifyEmailMessage("en", url);
    expect(azVerify.subject).toContain("təsdiqləyin");
    expect(enVerify.subject).toContain("Verify");
    expect(azVerify.html).toContain("token=abc&amp;next=1");
    expect(azVerify.text).toContain(url);

    const azReset = buildPasswordResetMessage("az", "https://panelim.az/az/reset-password?token=xyz");
    const enReset = buildPasswordResetMessage("en", "https://panelim.az/en/reset-password?token=xyz");
    expect(azReset.subject).toContain("sıfırlayın");
    expect(enReset.subject).toContain("Reset");

    const notice = buildExistingAccountNoticeMessage(
      "az",
      "https://panelim.az/az/login",
      "https://panelim.az/az/forgot-password",
    );
    expect(notice.text).toContain("https://panelim.az/az/forgot-password");
  });
});

describe("Phase 3: single-use account tokens", () => {
  it("generates URL-safe 256-bit tokens and deterministic 64-hex SHA-256 hashes", () => {
    const raw = generateRawAccountToken();
    expect(isValidAccountTokenFormat(raw)).toBe(true);
    expect(isValidAccountTokenFormat("short")).toBe(false);
    expect(isValidAccountTokenFormat("bad token with spaces!@#1234567890123456789012")).toBe(false);

    const hash1 = hashAccountToken(raw);
    const hash2 = hashAccountToken(raw);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(raw);
  });
});

describe("Phase 3: CSP nonce & route scoping", () => {
  it("generates unique nonces and strips unsafe-inline from script-src in strict mode", () => {
    const n1 = generateCspNonce();
    const n2 = generateCspNonce();
    expect(n1.length).toBeGreaterThanOrEqual(20);
    expect(n1).not.toBe(n2);

    const strict = buildCspHeader({ nonce: n1, isDev: false, env: {} });
    expect(strict).toContain(`script-src 'self' 'nonce-${n1}' 'strict-dynamic'`);
    expect(strict).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(strict).toContain("frame-ancestors 'none'");
    expect(strict).toContain("object-src 'none'");

    const withPaycell = buildCspHeader({
      nonce: n1,
      isDev: false,
      env: { QEYDAI_PAYCELL_CHECKOUT_URL: "https://checkout.paycell.az/pay" },
    });
    expect(withPaycell).toContain("form-action 'self' https://checkout.paycell.az");
  });

  it("matches sensitive auth & panel routes for nonce CSP and leaves public marketing static", () => {
    expect(isNonceCspPath("/az/panel")).toBe(true);
    expect(isNonceCspPath("/en/panel/settings")).toBe(true);
    expect(isNonceCspPath("/az/login")).toBe(true);
    expect(isNonceCspPath("/en/register")).toBe(true);
    expect(isNonceCspPath("/az/forgot-password")).toBe(true);
    expect(isNonceCspPath("/en/reset-password")).toBe(true);
    expect(isNonceCspPath("/az/verify-email")).toBe(true);
    expect(isNonceCspPath("/az/link-account")).toBe(true);
    expect(isNonceCspPath("/az/select-account")).toBe(true);

    expect(isNonceCspPath("/az")).toBe(false);
    expect(isNonceCspPath("/en/pricing")).toBe(false);
    expect(isNonceCspPath("/az/blog/whatsapp-crm")).toBe(false);
  });
});
