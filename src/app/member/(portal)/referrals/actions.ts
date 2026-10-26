"use server";

import { revalidatePath } from "next/cache";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { recordReferral as record } from "@/lib/member-activities/record";

/** Validation and the write live in src/lib/member-activities/record.ts, shared with the mobile app's API. */
export async function recordReferral(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const result = await record({ userId: session.user.id, memberId: member.id }, Object.fromEntries(formData));
  if (!result.ok) return { error: result.error, success: false };

  revalidatePath("/member/referrals");
  return { error: undefined, success: true };
}
