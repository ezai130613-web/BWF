"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/rbac";

/** Phase 20 Batch 5 — "Jump to member" on /admin/app-activity. A Server Action so it can redirect to a computed dynamic path with zero client JS (a plain GET form can only append query params to a fixed URL). */
export async function jumpToMember(formData: FormData) {
  await requireAdminSession();
  const memberId = formData.get("memberId");
  if (typeof memberId === "string" && memberId) {
    redirect(`/admin/app-activity/${memberId}`);
  }
}
