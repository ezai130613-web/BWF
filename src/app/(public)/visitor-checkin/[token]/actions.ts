"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { findOrCreateVisitorProfile } from "@/lib/visitors/manage";

export type VisitorCheckinState = { error?: string; success?: boolean };

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Mobile number is required"),
  email: optionalText(),
  companyName: optionalText(),
  businessCategory: optionalText(),
  description: optionalText(),
  source: z.enum([
    "INVITED_BY_MEMBER",
    "INSTAGRAM",
    "FACEBOOK",
    "YOUTUBE",
    "GOOGLE_SEARCH",
    "WHATSAPP",
    "REFERRAL",
    "OTHER",
  ]),
  invitingMemberId: optionalText(),
  sourceDetails: optionalText(),
  madePayment: z.enum(["yes", "no"]),
  amountInr: optionalText(),
  actualPaymentDate: optionalText(),
  proofUrl: optionalText(),
  idempotencyKey: z.string().min(1),
});

/**
 * Visitor Management System (2026-09-18), Step: visitor submits the QR
 * form. One transaction covers both outcomes (attendance + optional
 * payment), same discipline as the member checkIn() action this mirrors —
 * a partial failure must not silently lose a payment or duplicate
 * attendance. No login: identity comes entirely from what was typed here.
 */
export async function registerVisitorCheckin(
  token: string,
  _prevState: VisitorCheckinState | undefined,
  formData: FormData,
): Promise<VisitorCheckinState> {
  const meeting = await db.meeting.findUnique({ where: { visitorAttendanceQrToken: token } });
  if (!meeting) return { error: "This check-in link is invalid." };
  if (!meeting.visitorCheckInOpen) return { error: "Visitor check-in for this meeting isn't open right now." };

  const parsed = baseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const ip = await getClientIp();
  const allowed = await rateLimit(`visitor-checkin:${ip}`, { limit: 20, windowSeconds: 3600 });
  if (!allowed) return { error: TOO_MANY_REQUESTS_ERROR };

  if (data.source === "INVITED_BY_MEMBER" && !data.invitingMemberId) {
    return { error: "Select the member who invited you." };
  }
  if (data.source === "OTHER" && !data.sourceDetails) {
    return { error: "Tell us a bit more under 'Other'." };
  }

  let paymentInput: { amountInr: string; actualPaymentDate: Date; proofUrl: string } | null = null;
  if (data.madePayment === "yes") {
    if (!data.amountInr || Number(data.amountInr) <= 0) return { error: "Enter a valid amount paid." };
    if (!data.actualPaymentDate) return { error: "Enter the date the payment was made." };
    if (!data.proofUrl) return { error: "Upload payment proof (screenshot, receipt, or PDF)." };
    paymentInput = {
      amountInr: data.amountInr,
      actualPaymentDate: new Date(data.actualPaymentDate),
      proofUrl: data.proofUrl,
    };
  }

  try {
    await db.$transaction(async (tx) => {
      const profile = await findOrCreateVisitorProfile(tx, {
        name: data.name,
        phone: data.phone,
        email: data.email,
        companyName: data.companyName,
        businessCategory: data.businessCategory,
        description: data.description,
      });

      // Find-then-create, not create-then-catch: a Postgres transaction is
      // aborted the instant any statement inside it violates a constraint,
      // so recovering from a unique-violation by issuing a further query in
      // the SAME transaction (as a catch block would need to) fails with
      // "current transaction is aborted." Checking first avoids ever
      // hitting the constraint on the expected "already checked in" path —
      // same pattern the member checkIn() action already uses for
      // Attendance. The payment create below stays create-then-catch since
      // it's the transaction's last statement, with nothing after it to be
      // poisoned by an aborted state.
      let attendance = await tx.visitorAttendance.findUnique({
        where: { meetingId_visitorProfileId: { meetingId: meeting.id, visitorProfileId: profile.id } },
      });
      if (!attendance) {
        attendance = await tx.visitorAttendance.create({
          data: {
            visitorProfileId: profile.id,
            meetingId: meeting.id,
            chapterId: meeting.chapterId,
            source: data.source,
            sourceDetails: data.source === "OTHER" ? data.sourceDetails : undefined,
            invitingMemberId: data.source === "INVITED_BY_MEMBER" ? data.invitingMemberId : undefined,
            status: "PRESENT",
            checkedInAt: new Date(),
          },
        });
      }

      if (paymentInput) {
        try {
          await tx.visitorPayment.create({
            data: {
              visitorAttendanceId: attendance.id,
              amountInr: new Prisma.Decimal(paymentInput.amountInr),
              actualPaymentDate: paymentInput.actualPaymentDate,
              proofUrl: paymentInput.proofUrl,
              idempotencyKey: data.idempotencyKey,
            },
          });
        } catch (err) {
          // Unique violation on idempotencyKey (retried/double-clicked
          // submit) or on visitorAttendanceId (a payment already exists for
          // this visit) — both mean "already handled," not a new error.
          if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
        }
      }
    });
  } catch {
    return { error: "Something went wrong submitting your check-in. Please try again." };
  }

  revalidatePath("/admin/visitors-attendance");
  revalidatePath("/admin/visitors-payment");

  return { error: undefined, success: true };
}
