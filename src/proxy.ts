import { NextResponse, type NextRequest } from "next/server";
import { isBlogSlug, isChannelSlug } from "./lib/marketing/catalog";
import { isIndustrySlug } from "./lib/marketing/industries";
import { isAiSlug, isCaseSlug } from "./app/[lang]/dictionaries/pages";
import { buildCspHeader, generateCspNonce, isNonceCspPath } from "./lib/http/csp";

const locales = ["az", "en"] as const;
const defaultLocale = "az";

function pickLocale(req: NextRequest) {
  const header = req.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if ((locales as readonly string[]).includes(code)) return code;
  }
  return defaultLocale;
}

function nextWithCsp(req: NextRequest, pathname: string): NextResponse {
  if (isNonceCspPath(pathname)) {
    const nonce = generateCspNonce();
    const csp = buildCspHeader({ nonce });
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", buildCspHeader());
  return response;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    const match = /^\/(?:az|en)\/(channels|blog|industries|cases|ai)\/([^/]+)\/?$/.exec(pathname);
    if (match) {
      const [, section, rawSlug] = match;
      let slug = rawSlug;
      try {
        slug = decodeURIComponent(rawSlug);
      } catch {
        // A malformed slug cannot match the catalog.
      }
      const known =
        section === "channels"
          ? isChannelSlug(slug) || slug === "tiktok" || slug === "whatsapp-broadcast"
          : section === "blog"
            ? isBlogSlug(slug)
            : section === "industries"
              ? isIndustrySlug(slug)
              : section === "cases"
                ? isCaseSlug(slug)
                : isAiSlug(slug);
      if (!known) {
        const notFound = NextResponse.rewrite(new URL("/__marketing-not-found", req.url), { status: 404 });
        notFound.headers.set("Content-Security-Policy", buildCspHeader());
        return notFound;
      }
    }
    return nextWithCsp(req, pathname);
  }
  req.nextUrl.pathname = `/${pickLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(req.nextUrl);
}

export const config = {
  // Skip API routes, Next internals and files with an extension. "\\." is a literal dot in the regex.
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
