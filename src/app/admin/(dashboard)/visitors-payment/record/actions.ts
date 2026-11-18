"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { Prisma } from "@/generated/prisma/client";
import { findOrCreateVisitorProfile } from "@/lib/visitors/manage";

export type RecordVisitorPaymentState = { error?: string; success?: string };

const schema = z.object({
  meetingId: z.string().min(1, "Select the meeting."),
  attendanceId: z.string().optional(),
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  method: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"], "Select how they paid."),
  amountInr: z.coerce.number().positive("Enter the amount received."),
  actualPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the payment date."),
  reference: z.string().trim().max(200).optional(),
  remarks: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().min(1).max(100),
});

/**
 * Accounts records a visitor's cash / transfer / UPI / cheque payment by hand
 * (2026-11-18) — the visitor-side twin of "Record Offline Payment". It is
 * approved straight away. The visitor is either one who already checked in at
 * that meeting, or a new walk-in (added here as present).
 */
export async function recordVisitorPayment(_prev: RecordVisitorPaymentState | undefined, formData: FormData): Promise<RecordVisitorPaymentState> {
  const session = await requirePermission("payments:approve");
  const parsed = schema.safeParse(Object.fromEntries([...formData.entries()].map(([k, v]) => [k, v === "" ? undefined : v])));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const input = parsed.data;

  const meeting = await db.meeting.findUnique({ where: { id: input.meetingId }, select: { id: true, chapterId: true } });
  if (!meeting) return { error: "Meeting not found." };

  let attendanceId = input.attendanceId;
  let visitorName: string;
  if (attendanceId) {
    const attendance = await db.visitorAttendance.findUnique({
      where: { id: attendanceId },
      select: { id: true, meetingId: true, visitorProfile: { select: { name: true } }, payment: { select: { id: true } } },
    });
    if (!attendance || attendance.meetingId !== meeting.id) return { error: "That visitor isn't checked in at this meeting." };
    if (attendance.payment) return { error: `${attendance.visitorProfile.name} already has a payment for this meeting.` };
    visitorName = attendance.visitorProfile.name;
  } else {
    if (!input.name || !input.phone) return { error: "Enter the visitor's name and mobile number, or pick a visitor who has checked in." };
    visitorName = input.name;
  }

  try {
    const paymentId = await db.$transaction(async (tx) => {
      if (!attendanceId) {
        const profile = await findOrCreateVisitorProfile(tx, { name: input.name!, phone: input.phone! });
        const existing = await tx.visitorAttendance.findUnique({
          where: { meetingId_visitorProfileId: { meetingId: meeting.id, visitorProfileId: profile.id } },
          select: { id: true, payment: { select: { id: true } } },
        });
        if (existing?.payment) throw new Error("ALREADY_PAID");
        const attendance =
          existing ??
          (await tx.visitorAttendance.create({
            data: {
              visitorProfileId: profile.id,
              meetingId: meeting.id,
              chapterId: meeting.chapterId,
              source: "OTHER",
              sourceDetails: "Added by Accounts with a manual payment",
              status: "PRESENT",
              checkedInAt: new Date(),
            },
            select: { id: true },
          }));
        attendanceId = attendance.id;
      }
      const payment = await tx.visitorPayment.create({
        data: {
          visitorAttendanceId: attendanceId,
          amountInr: new Prisma.Decimal(input.amountInr),
          actualPaymentDate: new Date(`${input.actualPaymentDate}T00:00:00+05:30`),
          proofUrl: null,
          method: input.method,
          reference: input.reference || null,
          status: "APPROVED",
          reviewedByUserId: session.user.id,
          reviewedAt: new Date(),
          reviewRemarks: input.remarks || `Recorded by Accounts (${input.method.replace("_", " ").toLowerCase()}).`,
          idempotencyKey: input.idempotencyKey,
        },
        select: { id: true },
      });
      return payment.id;
    });
    await logActivity({
      userId: session.user.id,
      action: "visitor_payment.recorded_offline",
      entity: "VisitorPayment",
      entityId: paymentId,
      metadata: { visitor: visitorName, method: input.method, amount: input.amountInr },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_PAID") return { error: `${visitorName} already has a payment for this meeting.` };
    // Same form submitted twice — already recorded.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }

  revalidatePath("/admin/visitors-payment");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounts");
  return { success: `Recorded payment for ${visitorName}.` };
}
