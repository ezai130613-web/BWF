"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

/**
 * Spec: "Only Central Admin, Super Admin, or authorised Accounts Team may
 * approve or reject." Reuses the exact payments:approve permission the
 * member-facing Payment Management page already gates on — same rule, same
 * people, see the plan's own reasoning for not minting a visitor-specific
 * permission. Rejecting or leaving a payment pending never touches the
 * linked VisitorAttendance row — this action only ever writes to
 * VisitorPayment.
 */
export async function reviewVisitorPayment(
  visitorPaymentId: string,
  status: "APPROVED" | "REJECTED" | "CLARIFICATION_REQUESTED",
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const remarks = formData.get("remarks");
  const remarksText = typeof remarks === "string" ? remarks.trim() : "";

  if (status === "REJECTED" && !remarksText) {
    return { error: "A reason is required to reject a payment.", success: false };
  }

  const session = await requirePermission("payments:approve");

  const payment = await db.visitorPayment.findUnique({ where: { id: visitorPaymentId } });
  if (!payment) return { error: "Payment not found.", success: false };

  await db.visitorPayment.update({
    where: { id: visitorPaymentId },
    data: {
      status,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      reviewRemarks: remarksText || null,
    },
  });

  await logActivity({
    userId: session.user.id,
    action: `visitor_payment.${status.toLowerCase()}`,
    entity: "VisitorPayment",
    entityId: visitorPaymentId,
    metadata: { from: payment.status, to: status, remarks: remarksText || undefined },
  });

  revalidatePath("/admin/visitors-payment");
  return { error: undefined, success: true };
}
