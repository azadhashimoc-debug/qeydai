import { describe, expect, it } from "vitest";
import { readTrackingConfig, sanitizeTrackingId } from "./TrackingScripts";

describe("TrackingScripts config sanitization", () => {
  it("accepts valid GTM, GA4, Clarity, Meta, TikTok, LinkedIn, and UET IDs", () => {
    const cfg = readTrackingConfig({
      NEXT_PUBLIC_GTM_ID: "GTM-ABC1234",
      NEXT_PUBLIC_GA_ID: "G-1234567890",
      NEXT_PUBLIC_CLARITY_ID: "abc123xyz9",
      NEXT_PUBLIC_META_PIXEL_ID: "123456789012345",
      NEXT_PUBLIC_TIKTOK_PIXEL_ID: "C1234567890ABCDEF",
      NEXT_PUBLIC_LINKEDIN_PARTNER_ID: "6543210",
      NEXT_PUBLIC_BING_UET_ID: "98765432",
    });
    expect(cfg).toEqual({
      gtmId: "GTM-ABC1234",
      gaId: "G-1234567890",
      clarityId: "abc123xyz9",
      metaPixelId: "123456789012345",
      tiktokPixelId: "C1234567890ABCDEF",
      linkedinPartnerId: "6543210",
      bingUetId: "98765432",
    });
  });

  it("rejects empty, overly short, or script-injection strings", () => {
    expect(sanitizeTrackingId("")).toBeNull();
    expect(sanitizeTrackingId("  ")).toBeNull();
    expect(sanitizeTrackingId("ab")).toBeNull();
    expect(sanitizeTrackingId("GTM-1';alert(1);//")).toBeNull();
    expect(sanitizeTrackingId("<script>alert(1)</script>")).toBeNull();
  });
});
