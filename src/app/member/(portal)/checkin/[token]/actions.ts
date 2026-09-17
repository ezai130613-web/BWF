"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { hasApprovedOverlap, type MonthYear } from "@/lib/attendance/manage";
import { Prisma } from "@/generated/prisma/client";

export type CheckinState = { error?: string; success?: boolean };

/**
 * Step C of the spec's flow. One transaction covers both outcomes so a
 * partial failure can't "silently lose payment submissions, duplicate
 * attendance, or create duplicate transactions."
 */
export async function checkIn(token: string, _prevState: CheckinState | undefined, formData: FormData): Promise<CheckinState> {
  const meeting = await db.meeting.findUnique({ where: { attendanceQrToken: token } });
  if (!meeting) return { error: "This registration link is invalid." };

  const now = new Date();
  const withinWindow =
    (!meeting.checkInOpensAt || now >= meeting.checkInOpensAt) && (!meeting.checkInClosesAt || now <= meeting.checkInClosesAt);
  if (!meeting.attendanceRegistrationOpen || !withinWindow) {
    return { error: "Check-in for this meeting isn't open right now." };
  }

  const { member } = await requireMemberProfile();

  const idempotencyKey = formData.get("idempotencyKey");
  if (typeof idempotencyKey !== "string" || !idempotencyKey) return { error: "Invalid submission — please reload and try again." };

  const madePayment = formData.get("madePayment") === "yes";

  let paymentInput: {
    numberOfMonths: number;
    monthsCovered: MonthYear[];
    amountPaidInr: string;
    actualPaymentDate: Date;
    proofUrl: string;
  } | null = null;

  if (madePayment) {
    const numberOfMonths = Number(formData.get("numberOfMonths"));
    if (!Number.isInteger(numberOfMonths) || numberOfMonths < 1) {
      return { error: "Select the number of months." };
    }

    const monthsCovered: MonthYear[] = [];
    for (let i = 0; i < numberOfMonths; i++) {
      const month = Number(formData.get(`month_${i}`));
      const year = Number(formData.get(`year_${i}`));
      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
        return { error: "Select the month and year for every month covered." };
      }
      monthsCovered.push({ month, year });
    }

    const amountPaidInr = formData.get("amountPaidInr");
    const actualPaymentDateRaw = formData.get("actualPaymentDate");
    const proofUrl = formData.get("proofUrl");

    if (typeof amountPaidInr !== "string" || !amountPaidInr || Number(amountPaidInr) <= 0) {
      return { error: "Enter a valid amount paid." };
    }
    if (typeof actualPaymentDateRaw !== "string" || !actualPaymentDateRaw) {
      return { error: "Enter the date the payment was made." };
    }
    if (typeof proofUrl !== "string" || !proofUrl) {
      return { error: "Upload payment proof (screenshot, receipt, or PDF)." };
    }

    paymentInput = {
      numberOfMonths,
      monthsCovered,
      amountPaidInr,
      actualPaymentDate: new Date(actualPaymentDateRaw),
      proofUrl,
    };
  }

  const overlapsApprovedCoverage = paymentInput ? await hasApprovedOverlap(member.id, paymentInput.monthsCovered) : false;

  await db.$transaction(async (tx) => {
    const existing = await tx.attendance.findUnique({
      where: { meetingId_memberId: { meetingId: meeting.id, memberId: member.id } },
    });

    let attendanceId: string;
    if (!existing) {
      const created = await tx.attendance.create({
        data: { meetingId: meeting.id, memberId: member.id, status: "PRESENT", checkedInAt: now },
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
            memberId: member.id,
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

  return { error: undefined, success: true };
}
