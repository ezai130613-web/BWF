import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hasApprovedMembership, parseProofFields, type PaymentFieldSource } from "@/lib/payments/member-payments";
import { keyToDbDate, monthsOfDates, overlapsApprovedDates, resolveMemberMeetingSelection } from "@/lib/payments/coverage";
import { getContent } from "@/lib/content";
import { parseFee, quoteMeetings, quoteMembershipFee } from "@/lib/payments/fees";
import { getMeetingPackages } from "@/lib/payments/packages";
import { Prisma } from "@/generated/prisma/client";

/** Phase 40 — what a payment should come to (meeting package price for `meetings`, or the annual fee; null when unset). */
export async function expectedAmountFor(type: "MEETING" | "MEMBERSHIP", meetings: number): Promise<Prisma.Decimal | null> {
  const total =
    type === "MEETING"
      ? (quoteMeetings(meetings, await getMeetingPackages())?.total ?? null)
      : quoteMembershipFee(parseFee((await getContent(["fees.annualMembership"]))["fees.annualMembership"]));
  return total === null ? null : new Prisma.Decimal(total);
}

export type MemberPaymentState = { error?: string; success?: boolean };

/**
 * Member portal / payment-link submission (2026-10-21) — a meeting-package
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
    const selection = await resolveMemberMeetingSelection(memberId, formData);
    if (selection.error !== undefined) return { error: selection.error };
    const proof = parseProofFields(formData);
    if (proof.error !== undefined) return { error: proof.error };
    const { dates, numberOfMonths } = selection.data;
    data = {
      memberId: memberId,
      type: "MEETING",
      numberOfMonths,
      meetingDates: dates.map(keyToDbDate),
      monthsCovered: monthsOfDates(dates),
      amountPaidInr: new Prisma.Decimal(proof.data.amountPaidInr),
      expectedAmountInr: await expectedAmountFor("MEETING", dates.length),
      actualPaymentDate: proof.data.actualPaymentDate,
      proofUrl: proof.data.proofUrl,
      overlapsApprovedCoverage: await overlapsApprovedDates(memberId, dates),
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
      expectedAmountInr: await expectedAmountFor("MEMBERSHIP", 0),
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
