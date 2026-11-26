import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://panelim.az";

const privatePaths = [
  "/api/",
  "/panel",
  "/az/panel",
  "/en/panel",
  "/az/select-account",
  "/en/select-account",
  "/__marketing-not-found",
];

// AI crawlers that power answers in ChatGPT, Claude, Perplexity, Gemini and similar tools.
// Explicit rules make the allow-list visible and survive future changes to the wildcard rule.
const aiCrawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: "/", disallow: privatePaths })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
