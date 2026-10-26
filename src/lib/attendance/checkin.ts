import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isWithinCheckinWindow } from "@/lib/attendance/qr";
import { hasApprovedOverlap } from "@/lib/attendance/manage";
import { parseMeetingPaymentFields, type MeetingPaymentFields, type PaymentFieldSource } from "@/lib/payments/member-payments";
import { Prisma } from "@/generated/prisma/client";

export type CheckinState = { error?: string; success?: boolean };

/*
 * QR meeting check-in (2026-09-17) — shared by /member/checkin/[token] and
 * the mobile app's QR scanner (Phase 34). The meeting is fixed by the QR
 * token, the member by the caller's own session.
 */

/**
 * Step C of the spec's flow. One transaction covers both outcomes so a
 * partial failure can't "silently lose payment submissions, duplicate
 * attendance, or create duplicate transactions."
 */
export async function checkInMember(memberId: string, token: string, formData: PaymentFieldSource): Promise<CheckinState> {
  const meeting = await db.meeting.findUnique({ where: { attendanceQrToken: token } });
  if (!meeting) return { error: "This registration link is invalid." };

  const now = new Date();
  const withinWindow = isWithinCheckinWindow(meeting, now);
  if (!meeting.attendanceRegistrationOpen || !withinWindow) {
    return { error: "Check-in for this meeting isn't open right now." };
  }

  const idempotencyKey = formData.get("idempotencyKey");
  if (typeof idempotencyKey !== "string" || !idempotencyKey || idempotencyKey.length > 100) return { error: "Invalid submission — please reload and try again." };

  const madePayment = formData.get("madePayment") === "yes";

  let paymentInput: MeetingPaymentFields | null = null;
  if (madePayment) {
    const parsed = parseMeetingPaymentFields(formData);
    if (parsed.error !== undefined) return { error: parsed.error };
    paymentInput = parsed.data;
  }

  const overlapsApprovedCoverage = paymentInput ? await hasApprovedOverlap(memberId, paymentInput.monthsCovered) : false;

  await db.$transaction(async (tx) => {
    const existing = await tx.attendance.findUnique({
      where: { meetingId_memberId: { meetingId: meeting.id, memberId: memberId } },
    });

    let attendanceId: string;
    if (!existing) {
      const created = await tx.attendance.create({
        data: { meetingId: meeting.id, memberId: memberId, status: "PRESENT", checkedInAt: now },
      });
      attendanceId = created.id;
    } else if (existing.status === "ABSENT" && !existing.correctedByUserId) {
      // A stale Absent backfilled at a prior meeting closure (spec: "after
      // closure, mark expected members without check-in Absent") — a live
      // self-check-in now is more authoritative than that backfill, but an
      // admin's explicit correction (correctedByUserId set) never gets
      // silently overwritten by it.
      const updated = await tx.attendance.update({
        where: { id: existing.id },
        data: { status: "PRESENT", checkedInAt: now },
      });
      attendanceId = updated.id;
    } else {
      attendanceId = existing.id;
    }

    if (paymentInput) {
      try {
        await tx.payment.create({
          data: {
            memberId: memberId,
            meetingId: meeting.id,
            attendanceId,
            numberOfMonths: paymentInput.numberOfMonths,
            monthsCovered: paymentInput.monthsCovered,
            amountPaidInr: new Prisma.Decimal(paymentInput.amountPaidInr),
            actualPaymentDate: paymentInput.actualPaymentDate,
            proofUrl: paymentInput.proofUrl,
            overlapsApprovedCoverage,
            idempotencyKey,
          },
        });
      } catch (err) {
        // Unique violation on idempotencyKey = a retried/double-clicked
        // submit of the exact same attempt, not a new payment — treat as
        // already succeeded rather than surfacing an error.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      }
    }
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/payments");
  revalidatePath("/member/payments");

  return { error: undefined, success: true };
}
