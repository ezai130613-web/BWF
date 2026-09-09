"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const recordSchema = z.object({
  toMemberId: z.string().min(1, "Select a member"),
  amountInr: z.coerce.number().int().positive("Enter a real amount"),
  description: optionalText(),
  referralId: optionalText(),
});

export async function recordThankYouSlip(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = recordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  if (parsed.data.toMemberId === member.id) {
    return { error: "You can't record a Thank You Slip to yourself.", success: false };
  }

  // A linked referral, if any, must actually be one this member received —
  // otherwise they'd be thanking someone for a referral that isn't theirs.
  if (parsed.data.referralId) {
    const referral = await db.referral.findUnique({ where: { id: parsed.data.referralId } });
    if (!referral || referral.toMemberId !== member.id) {
      return { error: "That referral isn't one you received.", success: false };
    }
  }

  const slip = await db.thankYouSlip.create({
    data: { ...parsed.data, fromMemberId: member.id },
  });

  await logActivity({
    userId: session.user.id,
    action: "thank_you_slip.recorded",
    entity: "ThankYouSlip",
    entityId: slip.id,
    metadata: { fromMemberId: member.id, toMemberId: parsed.data.toMemberId, amountInr: parsed.data.amountInr },
  });

  revalidatePath("/member/thank-you-slips");
  return { error: undefined, success: true };
}
