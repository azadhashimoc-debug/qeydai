import { describe, expect, it } from "vitest";
import subpagesAz from "@/app/[lang]/dictionaries/subpages-az.json";
import subpagesEn from "@/app/[lang]/dictionaries/subpages-en.json";
import { INDUSTRIES } from "@/app/[lang]/dictionaries/industries";
import { PAGES } from "@/app/[lang]/dictionaries/pages";
import sitemap from "@/app/sitemap";
import { getSiteUrl, isSecureRequest, resolveOAuthOrigin } from "@/lib/http/site-url";
import { getPublicContactConfig, getProductVideoUrl } from "./contact-config";

const BRAND_SUFFIX = " | panelim.az";

describe("Phase 1 storefront, SEO, contact & site-url guards", () => {
  it("keeps every subpage SEO <title> at or below 65 characters", () => {
    const violations: Array<{ route: string; length: number; full: string }> = [];
    const check = (route: string, raw: string) => {
      const full = `${raw}${BRAND_SUFFIX}`;
      if (full.length > 65) {
        violations.push({ route, length: full.length, full });
      }
    };

    for (const [lang, dict] of [
      ["az", subpagesAz],
      ["en", subpagesEn],
    ] as const) {
      for (const [slug, post] of Object.entries(dict.blogPosts)) {
        check(`/${lang}/blog/${slug}`, post.title);
      }
      for (const [slug, ch] of Object.entries(dict.channelDetails)) {
        check(`/${lang}/channels/${slug}`, ch.title);
      }
      check(`/${lang}/product`, dict.product.hero.title);
      check(`/${lang}/pipeline`, dict.pipeline.hero.title);
      check(`/${lang}/inbox`, dict.inbox.hero.title);
      check(`/${lang}/ai`, dict.ai.hero.title);
      check(`/${lang}/booking`, dict.booking.hero.title);
      check(`/${lang}/channels`, dict.channelsHub.hero.title);
      check(`/${lang}/tools`, dict.tools.hero.title);
      check(`/${lang}/scenarios/fitness-centers`, dict.fitnessScenario.hero.title);
      check(`/${lang}/blog`, dict.blogHub.title);
      check(`/${lang}/pricing`, dict.pricingPage.hero.title);
      check(`/${lang}/demo`, dict.demoPage.hero.title);
      check(`/${lang}/contact`, dict.contactPage.hero.title);
      check(`/${lang}/legal/terms`, dict.legal.terms.title);
      check(`/${lang}/legal/privacy`, dict.legal.privacy.title);
    }

    for (const [slug, industry] of Object.entries(INDUSTRIES)) {
      check(`/az/industries/${slug}`, industry.az.title);
      check(`/en/industries/${slug}`, industry.en.title);
    }

    for (const [key, page] of Object.entries(PAGES)) {
      check(`/az/${key}`, page.az.title);
      check(`/en/${key}`, page.en.title);
    }

    expect(violations).toEqual([]);
  });

  it("never publishes placeholder WhatsApp numbers or unconfigured social links", () => {
    const empty = getPublicContactConfig({});
    expect(empty.socialChannels).toEqual([]);
    expect(empty.whatsappUrl).toBeNull();

    const fake = getPublicContactConfig({
      NEXT_PUBLIC_WHATSAPP_NUMBER: "+994 50 123 45 67",
      NEXT_PUBLIC_TELEGRAM_URL: "javascript:alert(1)",
    });
    expect(fake.socialChannels).toEqual([]);
    expect(fake.whatsappUrl).toBeNull();

    const real = getPublicContactConfig({
      NEXT_PUBLIC_WHATSAPP_NUMBER: "+994 50 777 88 99",
      NEXT_PUBLIC_TELEGRAM_URL: "https://t.me/real_panelim",
    });
    expect(real.whatsappUrl).toBe("https://wa.me/994507778899");
    expect(real.socialChannels.map((c) => c.id)).toEqual(["telegram", "whatsapp"]);
    expect(getProductVideoUrl("http://insecure.example/v.mp4")).toBeNull();
    expect(getProductVideoUrl("https://cdn.panelim.az/tour.mp4")).toBe("https://cdn.panelim.az/tour.mp4");
  });

  it("resolves canonical site URL, proxy HTTPS, and OAuth origin safely", () => {
    expect(getSiteUrl({})).toBe("https://panelim.az");
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://panelim.az/" })).toBe("https://panelim.az");

    const proxiedReq = new Request("http://127.0.0.1:3000/api/panel/oauth/google/start", {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(isSecureRequest(proxiedReq, { TRUST_PROXY: "x-real-ip" })).toBe(true);
    expect(isSecureRequest(proxiedReq, { TRUST_PROXY: "none" })).toBe(false);
    expect(resolveOAuthOrigin(proxiedReq, { NEXT_PUBLIC_SITE_URL: "https://panelim.az" })).toBe("https://panelim.az");
  });

  it("excludes roadmap-only and auth pages from sitemap and includes data-deletion", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/legal/data-deletion"))).toBe(true);
    expect(urls.some((u) => u.includes("/channels/tiktok"))).toBe(false);
    expect(urls.some((u) => u.includes("/channels/whatsapp-broadcast"))).toBe(false);
    expect(urls.some((u) => u.includes("/ai/multi-agents"))).toBe(false);
    expect(urls.some((u) => u.endsWith("/login") || u.endsWith("/register"))).toBe(false);
  });
});
