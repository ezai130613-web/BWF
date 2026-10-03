"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { ShieldOff } from "lucide-react";
import { signOutAllDevices } from "@/app/member/(portal)/account-actions";
import { secondaryButtonClass } from "@/components/member/ui";

export function SignOutEverywhereButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Sign out of BWF on every device, including this one?")) return;
        startTransition(async () => {
          await signOutAllDevices();
          await signOut({ callbackUrl: "/member/login" });
        });
      }}
      className={secondaryButtonClass}
    >
      <ShieldOff className="h-4 w-4" aria-hidden />
      {pending ? "Signing out…" : "Sign out of all devices"}
    </button>
  );
}
