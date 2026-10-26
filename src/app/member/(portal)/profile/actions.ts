"use server";

import { revalidatePath } from "next/cache";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { submitProfileRevision as submit } from "@/lib/members/profile-revision";

/** Creates a PENDING revision only — see src/lib/members/profile-revision.ts. */
export async function submitProfileRevision(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const result = await submit({ userId: session.user.id, memberId: member.id }, Object.fromEntries(formData));
  if (!result.ok) return { error: result.error };

  revalidatePath("/member/profile");
  return { error: undefined, success: true };
}
