"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-sm text-neutral-500 hover:text-neutral-900"
    >
      Sign out
    </button>
  );
}
