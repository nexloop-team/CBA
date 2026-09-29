import { NextResponse, type NextRequest } from "next/server";

/**
 * Trailing slashes for pages, and only for pages.
 *
 * next.config sets `skipTrailingSlashRedirect`, so this does the `/about` ->
 * `/about/` redirect that `trailingSlash: true` would otherwise do everywhere.
 * The point is what it skips: /api routes are called by /admin without
 * trailing slashes, and redirecting those would send every save to the server
 * twice.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.endsWith("/")) return NextResponse.next();

  // A plain URL: NextURL re-applies its own trailing-slash formatting, which
  // stripped the slash back off and made this redirect to itself.
  const url = new URL(request.url);
  url.pathname = `${pathname}/`;
  return NextResponse.redirect(url.toString(), 308);
}

export const config = {
  // Everything except the API, Next's own assets and files (anything with a dot).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
