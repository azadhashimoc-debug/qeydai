import { describe, expect, it, vi } from "vitest";
import { emailConfigured, hashLoginToken, loginLink, newLoginToken, normalizeEmail, renderLoginEmail, sendEmail } from "./email";

const env = { RESEND_API_KEY: "re_key", EMAIL_FROM: "panelim.az <noreply@panelim.az>", NEXT_PUBLIC_SITE_URL: "https://panelim.az" };

describe("normalizeEmail", () => {
  it("lower-cases and trims valid addresses", () => {
    expect(normalizeEmail("  Aysel@Example.AZ ")).toBe("aysel@example.az");
  });
  it("rejects anything that is not a plausible address", () => {
    for (const bad of ["", "a@b", "no-at.example.az", "a b@c.az", "<x@y.az>", "a@b@c.az", 5, null, "x".repeat(250) + "@a.az"]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
});

describe("emailConfigured", () => {
  it("needs key, sender and a site URL", () => {
    expect(emailConfigured(env)).toBe(true);
    expect(emailConfigured({ ...env, RESEND_API_KEY: "" })).toBe(false);
    expect(emailConfigured({ ...env, EMAIL_FROM: undefined })).toBe(false);
    expect(emailConfigured({ ...env, NEXT_PUBLIC_SITE_URL: undefined })).toBe(false);
  });
});

describe("login tokens", () => {
  it("are random, long, and stored only as a hash", () => {
    const a = newLoginToken();
    const b = newLoginToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.raw.length).toBeGreaterThanOrEqual(40);
    expect(a.hash).toBe(hashLoginToken(a.raw));
    expect(a.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.hash).not.toContain(a.raw);
  });
  it("build a link on the configured site with the token URL-encoded", () => {
    expect(loginLink("a+b/c", "en", env)).toBe("https://panelim.az/en/login/confirm?token=a%2Bb%2Fc");
    expect(loginLink("x", "az", {})).toBeNull();
  });
});

describe("mail rendering and sending", () => {
  const copy = { subject: "S", intro: "Hi <b>", button: "Go", expires: "15 min", ignore: "Ignore" };
  it("escapes copy and keeps a plain-text alternative with the link", () => {
    const mail = renderLoginEmail(copy, "https://panelim.az/az/login/confirm?token=t");
    expect(mail.html).toContain("Hi &lt;b&gt;");
    expect(mail.html).not.toContain("Hi <b>");
    expect(mail.text).toContain("https://panelim.az/az/login/confirm?token=t");
  });
  it("posts to Resend with a bearer key and reports success or failure without throwing", async () => {
    const ok = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendEmail("a@b.az", { subject: "S", html: "h", text: "t" }, env, ok)).toBe(true);
    const [url, init] = ok.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.authorization).toBe("Bearer re_key");
    expect(JSON.parse(init.body).to).toEqual(["a@b.az"]);
    const bad = vi.fn().mockResolvedValue(new Response("{}", { status: 422 }));
    expect(await sendEmail("a@b.az", { subject: "S", html: "h", text: "t" }, env, bad)).toBe(false);
    const boom = vi.fn().mockRejectedValue(new Error("net"));
    expect(await sendEmail("a@b.az", { subject: "S", html: "h", text: "t" }, env, boom)).toBe(false);
    expect(await sendEmail("a@b.az", { subject: "S", html: "h", text: "t" }, {}, ok)).toBe(false);
  });
});
