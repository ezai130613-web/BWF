"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteMarketingContent } from "@/app/admin/(dashboard)/marketing/actions";

export function DeleteMarketingContentButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this content? This can't be undone.")) return;
        startTransition(async () => {
          await deleteMarketingContent(contentId);
          router.push("/admin/marketing/library");
        });
      }}
      className="self-start text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete content"}
    </button>
  );
}
