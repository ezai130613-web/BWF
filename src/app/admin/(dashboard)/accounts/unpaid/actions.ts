"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/rbac";

const schema = z.object({
  memberId: z.string().min(1),
  feeType: z.enum(["MEETING", "MEMBERSHIP"]),
  note: z.string().trim().min(2, "Write what happened on this follow-up").max(1000),
  nextFollowUpOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

/** Add a dated remark while chasing an unpaid fee (many per member; never edited, only removed). */
export async function addPaymentFollowUp(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const session = await requirePermission("payments:approve");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { memberId, feeType, note, nextFollowUpOn } = parsed.data;

  const member = await db.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!member) return { error: "Member not found." };

  const row = await db.paymentFollowUp.create({
    data: {
      memberId,
      feeType,
      note,
      // IST midnight, so the date shown never slips a day.
      nextFollowUpOn: nextFollowUpOn ? new Date(`${nextFollowUpOn}T00:00:00+05:30`) : null,
      createdByUserId: session.user.id,
      createdByName: session.user.name ?? session.user.email ?? null,
    },
  });
  await logActivity({ userId: session.user.id, action: "payment_follow_up.created", entity: "PaymentFollowUp", entityId: row.id, metadata: { memberId, feeType } });
  revalidatePath(`/admin/accounts/unpaid/${memberId}`);
  revalidatePath("/admin/accounts/unpaid");
  return { ok: true };
}

export async function deletePaymentFollowUp(id: string) {
  const session = await requirePermission("payments:approve");
  const row = await db.paymentFollowUp.findUnique({ where: { id } });
  if (!row) return;
  await db.paymentFollowUp.delete({ where: { id } });
  await logActivity({ userId: session.user.id, action: "payment_follow_up.deleted", entity: "PaymentFollowUp", entityId: id, metadata: { memberId: row.memberId, feeType: row.feeType, note: row.note } });
  revalidatePath(`/admin/accounts/unpaid/${row.memberId}`);
  revalidatePath("/admin/accounts/unpaid");
}
