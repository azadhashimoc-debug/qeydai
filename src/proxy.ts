import { NextResponse, type NextRequest } from "next/server";

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
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  req.nextUrl.pathname = `/${pickLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(req.nextUrl);
}

export const config = {
  // Skip API routes, Next internals and files with an extension. "\\." is a literal dot in the regex.
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
