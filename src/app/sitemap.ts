import type { MetadataRoute } from "next";
import { statSync } from "node:fs";
import { BLOG_SLUGS, CHANNEL_SLUGS } from "@/lib/marketing/catalog";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_SUBPAGE_SUFFIXES = [
  "",
  "/product",
  "/pipeline",
  "/inbox",
  "/ai",
  "/booking",
  "/channels",
  ...CHANNEL_SLUGS.map((slug) => `/channels/${slug}`),
  "/tools",
  "/scenarios/fitness-centers",
  "/blog",
  ...BLOG_SLUGS.map((slug) => `/blog/${slug}`),
  "/pricing",
  "/demo",
  "/contact",
  "/login",
  "/register",
  "/legal/terms",
  "/legal/privacy",
] as const;

const pageMtime = () => {
  try {
    return statSync("src/app/[lang]/page.tsx").mtime.toISOString();
  } catch {
    return "2026-11-18T00:00:00.000Z";
  }
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = pageMtime();
  const entries: MetadataRoute.Sitemap = [];

  for (const suffix of STATIC_SUBPAGE_SUFFIXES) {
    const alternates = {
      languages: {
        az: `${base}/az${suffix}`,
        en: `${base}/en${suffix}`,
        "x-default": `${base}/az${suffix}`,
      },
    };

    for (const lang of ["az", "en"] as const) {
      const priority = suffix === "" ? (lang === "az" ? 1 : 0.9) : suffix.startsWith("/legal/") ? 0.4 : 0.8;
      entries.push({
        url: `${base}/${lang}${suffix}`,
        lastModified,
        changeFrequency: "weekly",
        priority,
        alternates,
      });
    }
  }

  return entries;
}
