import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { hashOtpCode } from "@/lib/auth/otp";
import { logActivity } from "@/lib/audit";

const ADMIN_ROLE_KEYS = ["SUPER_ADMIN", "CENTRAL_ADMIN"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    // Baseline per brief §55/§56 — shorter than a typical consumer app since
    // this session only ever belongs to an administrator.
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
        const challengeId = credentials?.challengeId;
        const code = credentials?.code;
        if (typeof challengeId !== "string" || typeof code !== "string") return null;

        const challenge = await db.otpChallenge.findUnique({
          where: { id: challengeId },
          include: { user: { include: { roles: { include: { role: true } } } } },
        });

        if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) return null;
        if (challenge.attempts >= challenge.maxAttempts) return null;

        const codeMatches = challenge.codeHash === hashOtpCode(code);

        if (!codeMatches) {
          await db.otpChallenge.update({
            where: { id: challenge.id },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }

        const roleKeys = challenge.user.roles.map((r) => r.role.key);
        if (!roleKeys.some((key) => ADMIN_ROLE_KEYS.includes(key))) return null;

        await db.$transaction([
          db.otpChallenge.update({
            where: { id: challenge.id },
            data: { consumedAt: new Date() },
          }),
          db.user.update({
            where: { id: challenge.userId },
            data: { lastLoginAt: new Date(), failedLoginCount: 0 },
          }),
        ]);

        await logActivity({
          userId: challenge.userId,
          action: "user.login_success",
        });

        return {
          id: challenge.user.id,
          email: challenge.user.email,
          name: challenge.user.name,
          roles: roleKeys,
          sessionVersion: challenge.user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — `user` is whatever authorize() returned above.
        token.id = user.id as string;
        token.roles = (user as { roles: string[] }).roles;
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
        session.user.authTime = (token.issuedAt as number) ?? 0;
      }

      return session;
    },
  },
});
