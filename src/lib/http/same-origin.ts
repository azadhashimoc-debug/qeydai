export const noStoreHeaders = { "cache-control": "no-store" } as const;

export type TrustProxyMode = "x-real-ip" | "x-forwarded-for" | "vercel" | "none";

/** Sentinel returned by clientKey() when no trusted client identity is available. */
export const UNKNOWN_CLIENT = "unknown";

/**
 * TRUST_PROXY wins when set ("none" disables proxy headers explicitly). On Vercel the edge
 * network overwrites x-real-ip / x-vercel-forwarded-for, so those are trusted by default there.
 */
export function parseTrustProxy(
  raw: string | undefined = process.env.TRUST_PROXY,
  onVercel: boolean = Boolean(process.env.VERCEL),
): TrustProxyMode {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "x-real-ip") return "x-real-ip";
  if (normalized === "x-forwarded-for" || normalized === "xff") return "x-forwarded-for";
  if (normalized === "vercel") return "vercel";
  if (normalized === "none") return "none";
  return onVercel ? "vercel" : "none";
}

/**
 * Client identity for rate limiting. Ignores proxy headers unless TRUST_PROXY explicitly
 * enables "x-real-ip" or "x-forwarded-for" ("xff"), or the app runs on Vercel, preventing
 * header-spoofing bypasses. Returns UNKNOWN_CLIENT when no trusted identity exists; callers
 * must not use that value as a shared per-client bucket (one caller could lock out everyone).
 */
export function clientKey(req: Request, mode: TrustProxyMode = parseTrustProxy()): string {
  if (mode === "x-real-ip") {
    return req.headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT;
  }
  if (mode === "x-forwarded-for") {
    const hops = req.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    return hops?.at(-1) ?? UNKNOWN_CLIENT;
  }
  if (mode === "vercel") {
    const vercelHop = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    return vercelHop || req.headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT;
  }
  return UNKNOWN_CLIENT;
}

export function isUnknownClient(key: string): boolean {
  return key === UNKNOWN_CLIENT;
}

/**
 * Rejects cross-site browser requests via Sec-Fetch-Site and verifies that any Origin header
 * matches the target Host (falling back to req.url host). Requests without Origin are allowed
 * for non-browser clients; browsers always send Origin on cross-site writes.
 */
export function sameOrigin(req: Request): boolean {
  const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
