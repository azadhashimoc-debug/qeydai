import { describe, expect, it } from "vitest";
import { getCompanyInfo } from "./company";

describe("company info", () => {
  it("shows nothing when nothing is configured", () => {
    const c = getCompanyInfo({});
    expect(c.social).toEqual([]);
    expect(c.phone).toBeNull();
    expect(c.email).toBeNull();
    expect(c.legalName).toBeNull();
  });

  it("builds a WhatsApp link only from a real-length number", () => {
    expect(getCompanyInfo({ NEXT_PUBLIC_CONTACT_WHATSAPP: "+994 55 555 55 55" }).social).toEqual([
      { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/994555555555" },
    ]);
    expect(getCompanyInfo({ NEXT_PUBLIC_CONTACT_WHATSAPP: "123" }).social).toEqual([]);
  });

  it("rejects non-https social links and malformed emails", () => {
    const c = getCompanyInfo({
      NEXT_PUBLIC_SOCIAL_TELEGRAM: "javascript:alert(1)",
      NEXT_PUBLIC_SOCIAL_INSTAGRAM: "http://instagram.com/x",
      NEXT_PUBLIC_CONTACT_EMAIL: "not-an-email",
    });
    expect(c.social).toEqual([]);
    expect(c.email).toBeNull();
  });

  it("falls back to the contact email for privacy requests", () => {
    expect(getCompanyInfo({ NEXT_PUBLIC_CONTACT_EMAIL: "hello@panelim.az" }).privacyEmail).toBe("hello@panelim.az");
  });
});
