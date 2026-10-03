import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authorizeLogin } from "@/lib/auth/login";
import { ADMIN_ROLE_KEYS, MEMBER_ROLE_KEYS } from "@/lib/auth/constants";

/** Standard session: expires after 8 hours without activity (the original
 * baseline, brief §55/§56). Every admin session is standard. */
const STANDARD_IDLE_MS = 8 * 60 * 60 * 1000;
/** Member "Keep me signed in on this device" (2026-10-03): 30 days without
 * activity. Not infinite — still revocable at any time through
 * sessionVersion ("Sign out of all devices", suspension, password change). */
const LONG_LIVED_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    // The cookie/JWT ceiling is the long-lived member session; the jwt()
    // callback below enforces the shorter 8-hour idle limit on every
    // standard (all admin, and non-"keep me signed in" member) session.
    // Super Admin's extra protection is still the separate
    // requireRecentAuth() step-up check for high-risk actions.
    maxAge: LONG_LIVED_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      id: "admin-login",
      name: "Admin login",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeLogin(credentials?.email, credentials?.password, ADMIN_ROLE_KEYS, { allowUsername: true });
      },
    }),
    Credentials({
      id: "member-login",
      name: "Member login",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
        remember: { label: "Keep me signed in", type: "text" },
      },
      async authorize(credentials) {
        return authorizeLogin(credentials?.email, credentials?.password, MEMBER_ROLE_KEYS, {
          allowUsername: true,
          longLived: credentials?.remember === "true",
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign-in — `user` is whatever authorize() returned above.
        token.id = user.id as string;
        token.roles = (user as { roles: string[] }).roles;
        token.chapterId = (user as { chapterId: string | null }).chapterId;
        token.sessionVersion = (user as { sessionVersion: number }).sessionVersion;
        token.longLived = (user as { longLived?: boolean }).longLived ?? false;
        token.issuedAt = Date.now();
        token.lastSeenAt = Date.now();
        return token;
      }

      // Step-up re-auth (brief §56) — requireRecentAuth() gates high-risk
      // actions on `issuedAt` being within the last 15 minutes, but a JWT
      // session otherwise lasts 8 hours and issuedAt was only ever set at
      // sign-in, so it would go stale for the overwhelming majority of a
      // session and every such action would 403 (the reported "you don't
      // have access" bug on Roles & Permissions). confirmRecentAuth()
      // (src/lib/auth/reauth-actions.ts) re-verifies the user's password
      // then calls the client `update()` hook with this flag, which is the
      // only way to bump issuedAt without a full sign-out/sign-in.
      if (trigger === "update" && (session as { refreshAuthTime?: boolean } | undefined)?.refreshAuthTime) {
        token.issuedAt = Date.now();
        return token;
      }

      // Every subsequent request — re-check against the database so that a
      // password change, a Super-Admin-initiated "sign out everywhere", or
      // an account suspension actually revokes this JWT rather than waiting
      // for it to expire. This is what makes "session management" (brief
      // §56) meaningful under a stateless JWT strategy.
      if (typeof token.id === "string") {
        const dbUser = await db.user.findUnique({ where: { id: token.id } });
        if (!dbUser || dbUser.status !== "ACTIVE" || dbUser.sessionVersion !== token.sessionVersion) {
          token.revoked = true;
        }
        // Read fresh every request (not frozen at sign-in) so finishing
        // /member/activate releases the portal immediately.
        token.mustActivate = Boolean(dbUser?.mustChangePassword);
      }

      // Idle timeout for standard sessions. Tokens issued before this field
      // existed have no lastSeenAt — start the clock now rather than
      // treating them as expired.
      const now = Date.now();
      const lastSeenAt = typeof token.lastSeenAt === "number" ? token.lastSeenAt : now;
      if (!token.longLived && now - lastSeenAt > STANDARD_IDLE_MS) token.revoked = true;
      token.lastSeenAt = now;

      return token;
    },
    async session({ session, token }) {
      if (token.revoked) {
        // Signal the empty/invalid session cleanly rather than exposing a
        // half-populated user object.
        return { ...session, user: undefined, expires: session.expires };
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) ?? [];
        session.user.chapterId = (token.chapterId as string | null | undefined) ?? null;
        session.user.authTime = (token.issuedAt as number) ?? 0;
        session.user.mustActivate = Boolean(token.mustActivate);
      }

      return session;
    },
  },
});
