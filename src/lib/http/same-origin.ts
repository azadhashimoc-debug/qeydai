export const noStoreHeaders = { "cache-control": "no-store" } as const;

export type TrustProxyMode = "x-real-ip" | "x-forwarded-for" | "none";

export function parseTrustProxy(raw: string | undefined = process.env.TRUST_PROXY): TrustProxyMode {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "x-real-ip") return "x-real-ip";
  if (normalized === "x-forwarded-for" || normalized === "xff") return "x-forwarded-for";
  return "none";
}

/**
 * Client identity for rate limiting. Ignores proxy headers unless TRUST_PROXY explicitly
 * enables "x-real-ip" or "x-forwarded-for" ("xff"), preventing header-spoofing bypasses.
 */
export function clientKey(req: Request, mode: TrustProxyMode = parseTrustProxy()): string {
  if (mode === "x-real-ip") {
    return req.headers.get("x-real-ip")?.trim() || "unknown";
  }
  if (mode === "x-forwarded-for") {
    const hops = req.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    return hops?.at(-1) ?? "unknown";
  }
  return "unknown";
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
