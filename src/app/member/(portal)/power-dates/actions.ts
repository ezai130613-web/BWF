"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const recordSchema = z.object({
  participantMemberId: z.string().min(1, "Select a fellow member"),
  externalContactName: z.string().min(1, "Enter who you introduced them to"),
  externalContactCompany: optionalText(),
  notes: optionalText(),
});

export async function recordPowerDate(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = recordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  if (parsed.data.participantMemberId === member.id) {
    return { error: "You can't record a Power Date with yourself as the fellow member.", success: false };
  }

  const powerDate = await db.powerDate.create({
    data: { ...parsed.data, hostMemberId: member.id },
  });

  await logActivity({
    userId: session.user.id,
    action: "power_date.recorded",
    entity: "PowerDate",
    entityId: powerDate.id,
    metadata: { hostMemberId: member.id, participantMemberId: parsed.data.participantMemberId },
  });

  revalidatePath("/member/power-dates");
  return { error: undefined, success: true };
}
