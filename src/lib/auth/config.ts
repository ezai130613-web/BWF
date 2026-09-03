import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authorizeOtpLogin } from "@/lib/auth/otp-login";
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
      id: "admin-otp",
      name: "Admin OTP",
      credentials: {
        challengeId: { label: "Challenge", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        return authorizeOtpLogin(credentials?.challengeId, credentials?.code, ADMIN_ROLE_KEYS);
      },
    }),
    Credentials({
      id: "member-otp",
      name: "Member OTP",
      credentials: {
        challengeId: { label: "Challenge", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        return authorizeOtpLogin(credentials?.challengeId, credentials?.code, MEMBER_ROLE_KEYS);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — `user` is whatever authorize() returned above.
        token.id = user.id as string;
        token.roles = (user as { roles: string[] }).roles;
        token.chapterId = (user as { chapterId: string | null }).chapterId;
        token.sessionVersion = (user as { sessionVersion: number }).sessionVersion;
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
