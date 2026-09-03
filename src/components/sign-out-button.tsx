"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className="text-sm text-neutral-500 hover:text-neutral-900"
    >
      Sign out
    </button>
  );
}
