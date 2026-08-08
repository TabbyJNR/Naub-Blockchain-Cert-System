import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lets the admin area live at its own subdomain (e.g. admin.example.com)
 * instead of only being reachable at example.com/admin.
 *
 * The subdomain to match is read from the ADMIN_HOSTNAME environment
 * variable (e.g. "admin.naubcert.com"), set in Vercel's project settings
 * once the subdomain has been added there. If ADMIN_HOSTNAME is not set,
 * this middleware does nothing and the app behaves exactly as before -
 * /admin remains reachable on the main domain only.
 *
 * All existing links in the app already point to "/admin" and
 * "/admin/dashboard/...", so no other code needs to change: this
 * middleware only rewrites the bare "/" request on the admin subdomain
 * so that visiting the subdomain's root goes straight to the login page.
 */
export function middleware(request: NextRequest) {
  const adminHost = process.env.ADMIN_HOSTNAME;
  if (!adminHost) {
    return NextResponse.next();
  }

  const hostname = request.headers.get("host") || "";
  const isAdminSubdomain = hostname === adminHost || hostname.startsWith(`${adminHost}:`);

  if (isAdminSubdomain && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Only run on the root path check above; everything else (including
  // /admin/... itself, all API routes, and static assets) passes through
  // untouched, so this has zero effect on existing behaviour elsewhere.
  matcher: "/",
};
