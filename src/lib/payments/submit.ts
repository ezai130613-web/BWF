import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hasApprovedOverlap } from "@/lib/attendance/manage";
import {
  hasApprovedMembership,
  parseMeetingPaymentFields,
  parseProofFields,
  type PaymentFieldSource,
} from "@/lib/payments/member-payments";
import { Prisma } from "@/generated/prisma/client";

export type MemberPaymentState = { error?: string; success?: boolean };

/**
 * Member portal / payment-link submission (2026-10-21) — a monthly meeting
 * payment or the annual membership subscription, made outside of QR
 * check-in, so it's never tied to a meeting or an attendance record. Lands
 * in the same Payment table and the same Pending Approval review queue.
 * Shared by the portal's Server Action and the mobile API.
 */
export async function submitMemberPaymentFor(
  memberId: string,
  type: "MEETING" | "MEMBERSHIP",
  formData: PaymentFieldSource,
): Promise<MemberPaymentState> {
  const idempotencyKey = formData.get("idempotencyKey");
  if (typeof idempotencyKey !== "string" || !idempotencyKey || idempotencyKey.length > 100) {
    return { error: "Invalid submission — please reload and try again." };
  }

  let data: Prisma.PaymentUncheckedCreateInput;
  if (type === "MEETING") {
    const parsed = parseMeetingPaymentFields(formData);
    if (parsed.error !== undefined) return { error: parsed.error };
    const p = parsed.data;
    data = {
      memberId: memberId,
      type: "MEETING",
      numberOfMonths: p.numberOfMonths,
      monthsCovered: p.monthsCovered,
      amountPaidInr: new Prisma.Decimal(p.amountPaidInr),
      actualPaymentDate: p.actualPaymentDate,
      proofUrl: p.proofUrl,
      overlapsApprovedCoverage: await hasApprovedOverlap(memberId, p.monthsCovered),
      idempotencyKey,
    };
  } else {
    const membershipYear = Number(formData.get("membershipYear"));
    if (!Number.isInteger(membershipYear) || membershipYear < 2000 || membershipYear > 2100) {
      return { error: "Select the membership year this payment is for." };
    }
    const parsed = parseProofFields(formData);
    if (parsed.error !== undefined) return { error: parsed.error };
    const p = parsed.data;
    data = {
      memberId: memberId,
      type: "MEMBERSHIP",
      membershipYear,
      numberOfMonths: 0,
      monthsCovered: [],
      amountPaidInr: new Prisma.Decimal(p.amountPaidInr),
      actualPaymentDate: p.actualPaymentDate,
      proofUrl: p.proofUrl,
      overlapsApprovedCoverage: await hasApprovedMembership(memberId, membershipYear),
      idempotencyKey,
    };
  }

  try {
    await db.payment.create({ data });
  } catch (err) {
    // Same idempotency handling as QR check-in: a retried submit of the
    // same attempt is treated as already succeeded.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }

  revalidatePath("/member/payments");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/members");
  revalidatePath("/admin/accounts");
  return { success: true };
}
