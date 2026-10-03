"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

/**
 * Approve, Reject (reason required) or Request Clarification. Phase 29
 * (client decision, 2026-10-03): only Super Admin and the Accounts
 * Department hold payments:approve by default — Central Admin no longer
 * does (see prisma/seed.ts). It's a blanket-only permission, never satisfied
 * by Chapter Admin's chapter scoping, unlike payments:view.
 */
export async function reviewPayment(
  paymentId: string,
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

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { error: "Payment not found.", success: false };

  await db.payment.update({
    where: { id: paymentId },
    data: {
      status,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      reviewRemarks: remarksText || null,
    },
  });

  await logActivity({
    userId: session.user.id,
    action: `payment.${status.toLowerCase()}`,
    entity: "Payment",
    entityId: paymentId,
    metadata: { from: payment.status, to: status, remarks: remarksText || undefined },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/members");
  revalidatePath("/admin/accounts");
  return { error: undefined, success: true };
}
