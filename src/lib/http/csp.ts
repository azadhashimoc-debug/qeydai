const NONCE_ROUTE_RE =
  /^\/(?:az|en)\/(panel|login|register|forgot-password|reset-password|verify-email|link-account|select-account)(?:\/|$)/;

/**
 * Generates a 128-bit cryptographically random base64 nonce using Web Crypto API
 * so it runs identically in both Node.js and Edge runtimes.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Returns true for dynamic auth and CRM panel routes that receive per-request
 * nonce-based strict CSP (no 'unsafe-inline' in script-src).
 */
export function isNonceCspPath(pathname: string): boolean {
  return NONCE_ROUTE_RE.test(pathname);
}

function safeHttpsOrigin(raw: string | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") return parsed.origin;
  } catch {
    // Ignore malformed optional URLs.
  }
  return null;
}

export function buildCspHeader(options: {
  nonce?: string;
  isDev?: boolean;
  env?: Record<string, string | undefined>;
} = {}): string {
  const env = options.env ?? process.env;
  const isDev = options.isDev ?? env.NODE_ENV === "development";
  const nonce = options.nonce?.trim() || undefined;

  const scriptHosts = new Set<string>(["'self'"]);
  if (nonce) {
    scriptHosts.add(`'nonce-${nonce}'`);
    scriptHosts.add("'strict-dynamic'");
  } else {
    scriptHosts.add("'unsafe-inline'");
  }
  if (isDev) {
    scriptHosts.add("'unsafe-eval'");
  }

  const connectHosts = new Set<string>(["'self'"]);
  const imgHosts = new Set<string>(["'self'", "data:"]);
  const formActions = new Set<string>(["'self'"]);

  const paycellOrigin = safeHttpsOrigin(env.QEYDAI_PAYCELL_CHECKOUT_URL);
  if (paycellOrigin) formActions.add(paycellOrigin);

  if (env.NEXT_PUBLIC_GTM_ID || env.NEXT_PUBLIC_GA_ID) {
    if (!nonce) scriptHosts.add("https://www.googletagmanager.com");
    connectHosts.add("https://www.google-analytics.com");
    connectHosts.add("https://region1.google-analytics.com");
  }
  if (env.NEXT_PUBLIC_CLARITY_ID) {
    if (!nonce) scriptHosts.add("https://www.clarity.ms");
    connectHosts.add("https://*.clarity.ms");
  }
  if (env.NEXT_PUBLIC_META_PIXEL_ID) {
    if (!nonce) scriptHosts.add("https://connect.facebook.net");
    connectHosts.add("https://www.facebook.com");
    imgHosts.add("https://www.facebook.com");
  }
  if (env.NEXT_PUBLIC_TIKTOK_PIXEL_ID) {
    if (!nonce) scriptHosts.add("https://analytics.tiktok.com");
    connectHosts.add("https://analytics.tiktok.com");
  }
  if (env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID) {
    if (!nonce) scriptHosts.add("https://snap.licdn.com");
    connectHosts.add("https://px.ads.linkedin.com");
    imgHosts.add("https://px.ads.linkedin.com");
  }
  if (env.NEXT_PUBLIC_BING_UET_ID) {
    if (!nonce) scriptHosts.add("https://bat.bing.com");
    connectHosts.add("https://bat.bing.com");
    imgHosts.add("https://bat.bing.com");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${Array.from(scriptHosts).join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${Array.from(imgHosts).join(" ")}`,
    "font-src 'self'",
    `connect-src ${Array.from(connectHosts).join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    `form-action ${Array.from(formActions).join(" ")}`,
    "object-src 'none'",
  ];

  return directives.join("; ");
}
