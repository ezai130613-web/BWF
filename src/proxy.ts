import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { ADMIN_ROLE_KEYS, MEMBER_ROLE_KEYS } from "@/lib/auth/constants";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (same behavior, defaults
// to the Node.js runtime now, which is what lets this safely wrap
// next-auth's `auth()` — see docs/ARCHITECTURE.md).
//
// Phase 11 extends this to /member/** alongside /admin/**, and makes both
// branches role-aware rather than just checking "is someone logged in".
// Before Phase 11 that was equivalent (the only sessions that existed were
// admin ones); now that members share the same session mechanism, generic
// isLoggedIn is wrong in two ways: it would let a signed-in Member's request
// pass through to /admin instead of bouncing at the edge, and — the bug this
// caught in testing — a Member landing on /admin/login while already
// logged-in-as-a-non-admin would get redirected back to /admin by this
// generic check, which requireAdminSession() would then redirect away from
// again, an infinite loop. Checking the actual role on each branch fixes
// both.
export default auth((request) => {
  const { pathname } = request.nextUrl;
  const roles = request.auth?.user?.roles ?? [];
  const hasAdminRole = roles.some((role) => ADMIN_ROLE_KEYS.includes(role));
  const hasMemberRole = roles.some((role) => MEMBER_ROLE_KEYS.includes(role));

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginPage = pathname === "/admin/login";
  if (isAdminRoute) {
    if (!hasAdminRole && !isAdminLoginPage) {
      const loginUrl = new URL("/admin/login", request.nextUrl.origin);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (hasAdminRole && isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin", request.nextUrl.origin));
    }
  }

  const isMemberRoute = pathname.startsWith("/member");
  const isMemberLoginPage = pathname === "/member/login";
  if (isMemberRoute) {
    if (!hasMemberRole && !isMemberLoginPage) {
      const loginUrl = new URL("/member/login", request.nextUrl.origin);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (hasMemberRole && isMemberLoginPage) {
      return NextResponse.redirect(new URL("/member", request.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/member/:path*"],
};
