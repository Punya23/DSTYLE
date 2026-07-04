import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/checkout", "/account"];
const ADMIN_ROUTES = ["/admin"];

// Next.js 16 renamed the `middleware` convention to `proxy`. The functionality
// is identical; NextAuth's `auth` wrapper is exported as the default proxy handler.
export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  if (isProtected && !req.auth) {
    const url = new URL("/", req.url);
    url.searchParams.set("authRequired", "1");
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdmin) {
    const role = req.auth?.user?.role;
    if (!req.auth || (role !== "ADMIN" && role !== "STAFF")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/checkout/:path*", "/account/:path*", "/admin/:path*"],
};
