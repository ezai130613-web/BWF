import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (same behavior, defaults
// to the Node.js runtime now, which is what lets this safely wrap
// next-auth's `auth()` — see docs/ARCHITECTURE.md).
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = !!request.auth?.user;
  const isLoginPage = pathname === "/admin/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/admin/login", request.nextUrl.origin);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
