import type { NextConfig } from "next";

const apiCsp = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

const nextConfig: NextConfig = {
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
        ],
      },
      {
        // Page CSP (with per-request nonces on auth/panel routes) is emitted by src/proxy.ts.
        // API routes skip proxy.ts, so they receive a strict default-src 'none' policy here.
        source: "/api/:path*",
        headers: [
          { key: "Content-Security-Policy", value: apiCsp },
        ],
      },
    ];
  },
};

export default nextConfig;
