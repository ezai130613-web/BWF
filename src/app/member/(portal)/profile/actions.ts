"use server";

import { revalidatePath } from "next/cache";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { submitProfileRevision as submit } from "@/lib/members/profile-revision";
import { birthdayFields, birthdayInputSchema, submittedBirthday, type SubmittedBirthday } from "@/lib/members/birthdays";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

/** Creates a PENDING revision only — see src/lib/members/profile-revision.ts. */
export async function submitProfileRevision(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const result = await submit({ userId: session.user.id, memberId: member.id }, Object.fromEntries(formData));
  if (!result.ok) return { error: result.error };

  revalidatePath("/member/profile");
  return { error: undefined, success: true };
}

/**
 * Phase 37 — the member sets their own birthday directly. Not public
 * profile content (only fellow members see day + month on Socials), so it
 * doesn't go through the profile-edit approval queue.
 */
export async function updateOwnBirthday(
  _prevState: { error?: string; success?: boolean; values?: SubmittedBirthday } | undefined,
  formData: FormData,
) {
  const { session, member } = await requireMemberProfile();

  const values = submittedBirthday(formData);
  const parsed = birthdayInputSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid birthday.", values };

  await db.member.update({ where: { id: member.id }, data: birthdayFields(parsed.data) });
  await logActivity({ userId: session.user.id, action: "member.birthday_updated", entity: "Member", entityId: member.id, metadata: { by: "member" } });

  revalidatePath("/member/profile");
  revalidatePath("/member/socials");
  return { error: undefined, success: true };
}
