import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authorizeLogin } from "@/lib/auth/login";
import { ADMIN_ROLE_KEYS, MEMBER_ROLE_KEYS } from "@/lib/auth/constants";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    // Baseline per brief §55/§56 — shared by both the admin and member
    // (Phase 11) login surfaces. Admins don't get a shorter session than
    // members here; Super Admin's extra protection is the separate
    // requireRecentAuth() step-up check for specific high-risk actions, not
    // a shorter blanket session.
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      id: "admin-login",
      name: "Admin login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeLogin(credentials?.email, credentials?.password, ADMIN_ROLE_KEYS);
      },
    }),
    Credentials({
      id: "member-login",
      name: "Member login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeLogin(credentials?.email, credentials?.password, MEMBER_ROLE_KEYS);
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
        token.issuedAt = Date.now();
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
      }

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
      }

      return session;
    },
  },
});
