"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { istParts } from "@/lib/ist";
import { setBooleanSetting } from "@/lib/settings";
import { Prisma } from "@/generated/prisma/client";
import {
  addMonthsKey,
  chapterMeetingDays,
  isDateKey,
  istDateKey,
  keyToDbDate,
  loadMemberForCoverage,
  meetingsPerMonth,
  memberMeetingCoverage,
  membershipStanding,
  monthsForMeetings,
  monthsOfDates,
  nextUnpaidMeetingDays,
  PACKAGE_ONLY_ERROR,
} from "@/lib/payments/coverage";
import { isMeetingPackage, MAX_PACKAGE_MEETINGS } from "@/lib/payments/fees";

/**
 * Offline payments entered by Accounts / Super Admin (client, 2026-11-03):
 * members who pay cash or by bank transfer, which Razorpay can't see.
 * Gated on payments:approve — held by Super Admin and Accounts only.
 */

export type MemberPaymentOptions = {
  memberId: string;
  name: string;
  chapterName: string;
  perMonth: number;
  /** Chapter meeting days from 3 months back to 15 months ahead, with what's already on file. */
  days: { date: string; status: "APPROVED" | "PENDING" | null }[];
  /** Next unpaid meetings (enough for the biggest package) — the auto-selection for a package. */
  nextUnpaid: string[];
  membership: { year: number; status: "APPROVED" | "PENDING" | null }[];
};

export async function loadMemberPaymentOptions(memberId: string): Promise<MemberPaymentOptions | { error: string }> {
  await requirePermission("payments:approve");
  const profile = await db.member.findUnique({ where: { id: memberId }, select: { name: true, chapter: { select: { name: true } } } });
  if (!profile) return { error: "Member not found." };
  const member = await loadMemberForCoverage(memberId);
  const today = istDateKey(new Date());
  const year = istParts(new Date()).year;
  const [days, coverage, nextUnpaid, ...membership] = await Promise.all([
    chapterMeetingDays(member.chapter, addMonthsKey(today, -3), addMonthsKey(today, 15)),
    memberMeetingCoverage(memberId),
    // "Next unpaid" for Accounts starts from today too — a back-dated entry can tick earlier meetings by hand.
    nextUnpaidMeetingDays(member, MAX_PACKAGE_MEETINGS),
    ...[year - 1, year, year + 1].map((y) => membershipStanding(memberId, y)),
  ]);
  return {
    memberId,
    name: profile.name,
    chapterName: profile.chapter.name,
    perMonth: meetingsPerMonth(member.chapter),
    days: days.map((d) => ({
      date: d.date,
      status: coverage.approved.has(d.date) ? "APPROVED" : coverage.pending.has(d.date) ? "PENDING" : null,
    })),
    nextUnpaid: nextUnpaid.map((d) => d.date),
    membership: [year - 1, year, year + 1].map((y, i) => ({ year: y, status: membership[i] })),
  };
}

const schema = z.object({
  memberId: z.string().min(1, "Select a member."),
  type: z.enum(["MEETING", "MEMBERSHIP"]),
  method: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"], "Select how they paid."),
  amountPaidInr: z.coerce.number().positive("Enter the amount received."),
  actualPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the payment date."),
  reference: z.string().trim().max(200).optional(),
  remarks: z.string().trim().max(1000).optional(),
  membershipYear: z.coerce.number().int().optional(),
  idempotencyKey: z.string().min(1).max(100),
});

export type RecordPaymentState = { error?: string; success?: string };

export async function recordOfflinePayment(_prev: RecordPaymentState | undefined, formData: FormData): Promise<RecordPaymentState> {
  const session = await requirePermission("payments:approve");
  const parsed = schema.safeParse({
    memberId: formData.get("memberId"),
    type: formData.get("type"),
    method: formData.get("method"),
    amountPaidInr: formData.get("amountPaidInr"),
    actualPaymentDate: formData.get("actualPaymentDate"),
    reference: formData.get("reference") || undefined,
    remarks: formData.get("remarks") || undefined,
    membershipYear: formData.get("membershipYear") || undefined,
    idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const input = parsed.data;
  const member = await db.member.findUnique({ where: { id: input.memberId }, select: { id: true, name: true } });
  if (!member) return { error: "Member not found." };

  const base = {
    memberId: member.id,
    type: input.type,
    method: input.method,
    amountPaidInr: new Prisma.Decimal(input.amountPaidInr),
    actualPaymentDate: new Date(`${input.actualPaymentDate}T00:00:00+05:30`),
    proofUrl: null,
    reference: input.reference || null,
    status: "APPROVED" as const,
    reviewedByUserId: session.user.id,
    reviewedAt: new Date(),
    reviewRemarks: input.remarks || `Recorded by Accounts (${input.method.replace("_", " ").toLowerCase()}).`,
    idempotencyKey: input.idempotencyKey,
  };

  let data: Prisma.PaymentUncheckedCreateInput;
  let summary: string;
  if (input.type === "MEETING") {
    const dates = [...new Set(formData.getAll("meetingDate").map(String))].filter(isDateKey).sort();
    const packageSize = Number(formData.get("meetingsToPay"));
    if (!isMeetingPackage(packageSize)) return { error: PACKAGE_ONLY_ERROR };
    if (dates.length !== packageSize) return { error: `Tick exactly ${packageSize} meetings for this package (${dates.length} ticked).` };
    // Only real meeting days of the member's chapter, and none already paid.
    const coverageMember = await loadMemberForCoverage(member.id);
    const valid = new Set(
      (await chapterMeetingDays(coverageMember.chapter, dates[0], dates[dates.length - 1])).map((d) => d.date),
    );
    const bad = dates.filter((d) => !valid.has(d));
    if (bad.length) return { error: `Not a meeting date for this member's chapter: ${bad.join(", ")}.` };
    const { approved } = await memberMeetingCoverage(member.id);
    const already = dates.filter((d) => approved.has(d));
    if (already.length) return { error: `Already paid: ${already.join(", ")}. Untick those dates.` };
    data = {
      ...base,
      numberOfMonths: monthsForMeetings(dates.length, coverageMember.chapter),
      meetingDates: dates.map(keyToDbDate),
      monthsCovered: monthsOfDates(dates),
    };
    summary = `${dates.length} meeting(s)`;
  } else {
    const year = input.membershipYear;
    if (!year || year < 2000 || year > 2100) return { error: "Select the membership year." };
    if ((await membershipStanding(member.id, year)) === "APPROVED") return { error: `${member.name}'s ${year} membership is already paid.` };
    data = { ...base, membershipYear: year, numberOfMonths: 0, monthsCovered: [] };
    summary = `membership ${year}`;
  }

  try {
    const payment = await db.payment.create({ data });
    await logActivity({
      userId: session.user.id,
      action: "payment.recorded_offline",
      entity: "Payment",
      entityId: payment.id,
      metadata: { memberId: member.id, type: input.type, method: input.method, amount: input.amountPaidInr, summary },
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/members");
  revalidatePath("/admin/accounts");
  revalidatePath("/member/payments");
  return { success: `Recorded ${summary} for ${member.name}.` };
}

/** The "attendance requires payment" switch — Super Admin and Accounts. */
export async function setAttendanceRequiresPayment(on: boolean) {
  const session = await requirePermission("payments:approve");
  await setBooleanSetting("attendance.requirePayment", on);
  await logActivity({ userId: session.user.id, action: on ? "attendance.payment_required_on" : "attendance.payment_required_off", entity: "AppSetting" });
  revalidatePath("/admin/payments/record");
  revalidatePath("/admin/accounts");
}
