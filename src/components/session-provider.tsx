"use client";

import { SessionProvider } from "next-auth/react";

/** Generic NextAuth session context — shared by both the admin and member (Phase 11) layouts, neither of which needs anything surface-specific from it. */
export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
