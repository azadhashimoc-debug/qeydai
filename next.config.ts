import type { NextConfig } from "next";

const scriptHosts = new Set<string>(["'self'", "'unsafe-inline'"]);
const connectHosts = new Set<string>(["'self'"]);
const imgHosts = new Set<string>(["'self'", "data:"]);

if (process.env.NEXT_PUBLIC_GTM_ID || process.env.NEXT_PUBLIC_GA_ID) {
  scriptHosts.add("https://www.googletagmanager.com");
  connectHosts.add("https://www.google-analytics.com");
  connectHosts.add("https://region1.google-analytics.com");
}
if (process.env.NEXT_PUBLIC_CLARITY_ID) {
  scriptHosts.add("https://www.clarity.ms");
  connectHosts.add("https://*.clarity.ms");
}
if (process.env.NEXT_PUBLIC_META_PIXEL_ID) {
  scriptHosts.add("https://connect.facebook.net");
  connectHosts.add("https://www.facebook.com");
  imgHosts.add("https://www.facebook.com");
}
if (process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID) {
  scriptHosts.add("https://analytics.tiktok.com");
  connectHosts.add("https://analytics.tiktok.com");
}
if (process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID) {
  scriptHosts.add("https://snap.licdn.com");
  connectHosts.add("https://px.ads.linkedin.com");
  imgHosts.add("https://px.ads.linkedin.com");
}
if (process.env.NEXT_PUBLIC_BING_UET_ID) {
  scriptHosts.add("https://bat.bing.com");
  connectHosts.add("https://bat.bing.com");
  imgHosts.add("https://bat.bing.com");
}

const csp = [
  "default-src 'self'",
  `script-src ${Array.from(scriptHosts).join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${Array.from(imgHosts).join(" ")}`,
  "font-src 'self'",
  `connect-src ${Array.from(connectHosts).join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    globalNotFound: true,
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
