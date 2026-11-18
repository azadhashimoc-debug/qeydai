import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  estimateWhatsAppCost,
  normalizePhoneDigits,
  sanitizeQrUrl,
} from "./wa-tools";
import { BLOG_SLUGS, CHANNEL_SLUGS, isBlogSlug, isChannelSlug } from "./catalog";

describe("wa-tools", () => {
  it("normalizes country code and local number digits, dropping leading zero on local part", () => {
    expect(normalizePhoneDigits("+994", "050 123 45 67")).toBe("994501234567");
    expect(normalizePhoneDigits("994", "50-123-45-67")).toBe("994501234567");
    expect(normalizePhoneDigits("", "0501234567")).toBe("0501234567");
  });

  it("builds wa.me URL with normalized digits and encoded message", () => {
    expect(buildWhatsAppUrl("+994", "050 123 45 67", "Salam, demo istəyirəm")).toBe(
      "https://wa.me/994501234567?text=Salam%2C%20demo%20ist%C9%99yir%C9%99m",
    );
  });

  it("omits text query param when message is blank", () => {
    expect(buildWhatsAppUrl("+994", "050 123 45 67", "   ")).toBe(
      "https://wa.me/994501234567",
    );
  });

  it("returns null for empty, too-short, or too-long phone numbers", () => {
    expect(buildWhatsAppUrl("+994", "12", "")).toBeNull();
    expect(buildWhatsAppUrl("", "", "hello")).toBeNull();
    expect(buildWhatsAppUrl("+994", "123456789012345", "")).toBeNull();
  });

  it("sanitizeQrUrl allows https/http only and rejects javascript/data/invalid URLs", () => {
    expect(sanitizeQrUrl("https://wa.me/994501234567")).toBe("https://wa.me/994501234567");
    expect(sanitizeQrUrl("  http://panelim.az/tools  ")).toBe("http://panelim.az/tools");
    expect(sanitizeQrUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeQrUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeQrUrl("not a url")).toBeNull();
  });

  it("estimateWhatsAppCost clamps invalid/negative counts and keeps service windows free", () => {
    const res = estimateWhatsAppCost({ marketing: -5, utility: 100.9, auth: Number.NaN, service: 500 });
    expect(res.marketingUsd).toBe(0);
    expect(res.serviceUsd).toBe(0);
    expect(res.utilityUsd).toBeGreaterThan(0);
    expect(res.totalAzn).toBeCloseTo(res.totalUsd * 1.7, 2);
  });

  it("estimateWhatsAppCost computes exact Meta benchmark rates and handles invalid aznRate", () => {
    const res = estimateWhatsAppCost({ marketing: 100, utility: 200, auth: 50, service: 300 }, 2);
    expect(res.marketingUsd).toBeCloseTo(4.5, 4);
    expect(res.utilityUsd).toBeCloseTo(3.0, 4);
    expect(res.authUsd).toBeCloseTo(0.6, 4);
    expect(res.serviceUsd).toBe(0);
    expect(res.totalUsd).toBeCloseTo(8.1, 4);
    expect(res.totalAzn).toBeCloseTo(16.2, 4);

    const fallbackRate = estimateWhatsAppCost({ marketing: 100, utility: 0, auth: 0, service: 0 }, -1);
    expect(fallbackRate.totalAzn).toBeCloseTo(4.5 * 1.7, 4);
  });
});

describe("catalog slug guards", () => {
  it("accepts valid channel/blog slugs and rejects prototype keys", () => {
    expect(CHANNEL_SLUGS).toEqual(["whatsapp", "instagram", "telegram", "webhook-api"]);
    expect(BLOG_SLUGS).toEqual([
      "whatsapp-automation",
      "instagram-dm-sales",
      "appointment-crm",
      "ai-reply-workflows",
      "telegram-lead-capture",
    ]);
    expect(isChannelSlug("whatsapp")).toBe(true);
    expect(isChannelSlug("shopify")).toBe(false);
    expect(isChannelSlug("toString")).toBe(false);
    expect(isBlogSlug("whatsapp-automation")).toBe(true);
    expect(isBlogSlug("constructor")).toBe(false);
  });
});
