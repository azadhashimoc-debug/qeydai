import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/panel",
        "/az/panel",
        "/en/panel",
        "/az/select-account",
        "/en/select-account",
        "/__marketing-not-found",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
