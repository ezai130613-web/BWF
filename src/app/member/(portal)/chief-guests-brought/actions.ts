"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const recordSchema = z.object({
  name: z.string().min(1, "Enter the Chief Guest's name"),
  company: optionalText(),
  designation: optionalText(),
  notes: optionalText(),
});

/**
 * Phase 20 Batch 5 — a member self-reports inviting a Chief Guest to a
 * meeting. Deliberately a separate model/flow from the public ChiefGuest
 * homepage showcase (`/admin/chief-guests`) — this is the member's own
 * private activity credit, not curated public social proof; an admin can
 * still add the same person to the public carousel separately if wanted.
 */
export async function recordMemberChiefGuest(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = recordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const guest = await db.memberChiefGuest.create({
    data: { ...parsed.data, memberId: member.id },
  });

  await logActivity({
    userId: session.user.id,
    action: "member_chief_guest.recorded",
    entity: "MemberChiefGuest",
    entityId: guest.id,
    metadata: { memberId: member.id },
  });

  revalidatePath("/member/chief-guests-brought");
  return { error: undefined, success: true };
}
