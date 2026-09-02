import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: (DefaultSession["user"] & {
      id: string;
      roles: string[];
      /** Unix ms timestamp the current JWT was issued — used for step-up re-auth checks. */
      authTime: number;
    }) | undefined;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: string[];
    sessionVersion?: number;
    issuedAt?: number;
    revoked?: boolean;
  }
}
