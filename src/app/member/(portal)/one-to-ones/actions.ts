"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const recordSchema = z.object({
  withMemberId: z.string().min(1, "Select a member"),
  notes: optionalText(),
});

export async function recordOneToOne(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = recordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  if (parsed.data.withMemberId === member.id) {
    return { error: "You can't record a One-to-One with yourself.", success: false };
  }

  const oneToOne = await db.oneToOne.create({
    data: { ...parsed.data, memberId: member.id },
  });

  await logActivity({
    userId: session.user.id,
    action: "one_to_one.recorded",
    entity: "OneToOne",
    entityId: oneToOne.id,
    metadata: { memberId: member.id, withMemberId: parsed.data.withMemberId },
  });

  revalidatePath("/member/one-to-ones");
  return { error: undefined, success: true };
}
