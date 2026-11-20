import { NextResponse, type NextRequest } from "next/server";
import { isBlogSlug, isChannelSlug } from "./lib/marketing/catalog";

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

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    const match = /^\/(?:az|en)\/(channels|blog)\/([^/]+)\/?$/.exec(pathname);
    if (match) {
      const [, section, rawSlug] = match;
      let slug = rawSlug;
      try {
        slug = decodeURIComponent(rawSlug);
      } catch {
        // A malformed slug cannot match the catalog.
      }
      if (!(section === "channels" ? isChannelSlug(slug) : isBlogSlug(slug))) {
        return NextResponse.rewrite(new URL("/__marketing-not-found", req.url), { status: 404 });
      }
    }
    return;
  }
  req.nextUrl.pathname = `/${pickLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(req.nextUrl);
}

export const config = {
  // Skip API routes, Next internals and files with an extension. "\\." is a literal dot in the regex.
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
