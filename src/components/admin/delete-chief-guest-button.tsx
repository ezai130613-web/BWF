"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteChiefGuest } from "@/app/admin/(dashboard)/chief-guests/actions";

export function DeleteChiefGuestButton({ guestId }: { guestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this Chief Guest? This can't be undone.")) return;
        startTransition(async () => {
          await deleteChiefGuest(guestId);
          router.push("/admin/chief-guests");
        });
      }}
      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
