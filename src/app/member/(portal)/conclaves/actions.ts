"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const recordSchema = z.object({
  location: optionalText(),
  notes: optionalText(),
});

export async function recordConclave(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = recordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const participantIds = [...new Set(formData.getAll("participantMemberIds").map(String))].filter(
    (id) => id !== member.id,
  );

  // A Conclave is 3+ BWF members — the organizer plus at least 2 others.
  if (participantIds.length < 2) {
    return { error: "Select at least 2 fellow members — a Conclave is 3 or more members together.", success: false };
  }

  const conclave = await db.conclave.create({
    data: {
      ...parsed.data,
      organizedByMemberId: member.id,
      participants: { create: participantIds.map((memberId) => ({ memberId })) },
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "conclave.recorded",
    entity: "Conclave",
    entityId: conclave.id,
    metadata: { organizedByMemberId: member.id, participantIds },
  });

  revalidatePath("/member/conclaves");
  return { error: undefined, success: true };
}
