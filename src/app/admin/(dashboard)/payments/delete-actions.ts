"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { isManualMethod } from "@/lib/payments/manual";

export type DeletePaymentState = { error?: string; deleted?: boolean };

/**
 * 2026-11-18 — delete a payment Accounts recorded by hand (cash / UPI / bank
 * transfer / cheque) — e.g. entered against the wrong member or amount.
 * Payments members paid or submitted themselves (Razorpay, screenshot) are
 * never deleted — reject them instead. A payment that already has an invoice
 * can't be deleted either (invoice numbers must not leave gaps). Every delete
 * needs a reason and is written to the activity log with a full snapshot.
 */
export async function deleteRecordedPayment(kind: "member" | "visitor", id: string, _prev: DeletePaymentState | undefined, formData: FormData): Promise<DeletePaymentState> {
  const session = await requirePermission("payments:approve");
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) return { error: "Enter a reason for deleting." };

  if (kind === "member") {
    const p = await db.payment.findUnique({ where: { id }, include: { invoice: { select: { number: true } }, member: { select: { name: true } } } });
    if (!p) return { error: "Payment not found (it may already be deleted)." };
    if (!isManualMethod(p.method)) return { error: "Only payments recorded by Accounts can be deleted. Reject member-submitted payments instead." };
    if (p.invoice) return { error: `Invoice ${p.invoice.number} was issued for this payment, so it can't be deleted.` };
    await db.payment.delete({ where: { id } });
    await logActivity({
      userId: session.user.id,
      action: "payment.deleted",
      entity: "Payment",
      entityId: id,
      metadata: {
        reason,
        member: p.member.name,
        memberId: p.memberId,
        type: p.type,
        method: p.method,
        amountInr: p.amountPaidInr.toString(),
        paymentDate: p.actualPaymentDate.toISOString(),
        membershipYear: p.membershipYear,
        meetingDates: p.meetingDates.map((d) => d.toISOString().slice(0, 10)),
        reference: p.reference,
      },
    });
    revalidatePath("/admin/payments/members");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/accounts");
    revalidatePath("/admin/accounts/unpaid");
    revalidatePath("/member/payments");
    return { deleted: true };
  }

  const v = await db.visitorPayment.findUnique({
    where: { id },
    include: { visitorAttendance: { select: { visitorProfile: { select: { name: true } }, meetingId: true } } },
  });
  if (!v) return { error: "Payment not found (it may already be deleted)." };
  if (!isManualMethod(v.method)) return { error: "Only payments recorded by Accounts can be deleted. Reject visitor-submitted payments instead." };
  await db.visitorPayment.delete({ where: { id } });
  await logActivity({
    userId: session.user.id,
    action: "visitor_payment.deleted",
    entity: "VisitorPayment",
    entityId: id,
    metadata: {
      reason,
      visitor: v.visitorAttendance.visitorProfile.name,
      meetingId: v.visitorAttendance.meetingId,
      method: v.method,
      amountInr: v.amountInr.toString(),
      paymentDate: v.actualPaymentDate.toISOString(),
      reference: v.reference,
    },
  });
  revalidatePath("/admin/visitors-payment");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounts");
  return { deleted: true };
}
