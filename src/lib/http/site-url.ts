import { parseTrustProxy } from "./same-origin";

export const DEFAULT_SITE_URL = "https://panelim.az";

/**
 * Returns the canonical public site origin without a trailing slash.
 * Falls back to https://panelim.az so canonicals, sitemap, robots, and OAuth
 * never leak http://localhost:3000 in production builds.
 */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      // Fall through to default canonical domain.
    }
  }
  return DEFAULT_SITE_URL;
}

/**
 * Resolves the OAuth callback origin. Prefers explicit NEXT_PUBLIC_SITE_URL
 * (so reverse proxies forwarding HTTP internally still produce the public HTTPS
 * callback URI), otherwise uses the request's origin.
 */
export function resolveOAuthOrigin(req: Request, env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      const parsed = new URL(explicit);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed env value and fall back to request origin.
    }
  }
  return new URL(req.url).origin;
}

/**
 * Determines whether the incoming request arrived over HTTPS, honoring
 * x-forwarded-proto when running behind a trusted reverse proxy or Vercel.
 */
export function isSecureRequest(req: Request, env: Record<string, string | undefined> = process.env): boolean {
  try {
    if (new URL(req.url).protocol === "https:") return true;
  } catch {
    // Ignore malformed URL.
  }
  const trustMode = parseTrustProxy(env.TRUST_PROXY, Boolean(env.VERCEL));
  if (trustMode !== "none") {
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
  }
  return false;
}
