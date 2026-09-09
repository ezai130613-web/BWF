"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const recordSchema = z.object({
  toMemberId: z.string().min(1, "Select a member"),
  type: z.enum(["OUTSIDE", "SELF"]),
  description: optionalText(),
});

export async function recordReferral(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = recordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  if (parsed.data.toMemberId === member.id) {
    return { error: "You can't record a referral to yourself.", success: false };
  }

  const referral = await db.referral.create({
    data: { ...parsed.data, fromMemberId: member.id },
  });

  await logActivity({
    userId: session.user.id,
    action: "referral.recorded",
    entity: "Referral",
    entityId: referral.id,
    metadata: { fromMemberId: member.id, toMemberId: parsed.data.toMemberId },
  });

  revalidatePath("/member/referrals");
  return { error: undefined, success: true };
}
