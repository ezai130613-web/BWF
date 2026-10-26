import { z } from "zod";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { formatAnnualMembershipFee, formatInr, withGst } from "@/lib/format";
import { formatMonthYear, formatMonthsCovered } from "@/lib/attendance/manage";
import { fieldsFromJson } from "@/lib/payments/member-payments";
import { buildMonthGrid, summarizeMemberPayments } from "@/lib/payments/overview";
import { MEETING_FEE_GST_PERCENT, parseFee, quoteMembershipFee } from "@/lib/payments/fees";
import { submitMemberPaymentFor } from "@/lib/payments/submit";
import { isOwnStorageUrl, isStorageConfigured } from "@/lib/storage";
import { invalid, json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { PaymentsResponse } from "@/lib/mobile/contract";

const PAYEE_KEYS = [
  "fees.monthlyMeeting",
  "fees.annualMembership",
  "payment.qrCodeUrl",
  "payment.bankAccountName",
  "payment.bankAccountNumber",
  "payment.bankIfsc",
  "payment.upiId",
  "payment.bankName",
  "payment.membershipQrCodeUrl",
  "payment.membershipBankAccountName",
  "payment.membershipBankAccountNumber",
  "payment.membershipBankIfsc",
  "payment.membershipUpiId",
  "payment.membershipBankName",
];

/** The member's payments, standing, and where to pay — the data behind /member/payments. */
export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const [payments, content] = await Promise.all([
    db.payment.findMany({ where: { memberId: member.id }, include: { meeting: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    getContent(PAYEE_KEYS),
  ]);
  const summary = summarizeMemberPayments(payments);
  const monthlyFee = formatInr(content["fees.monthlyMeeting"]);
  const annualFee = formatAnnualMembershipFee(content["fees.annualMembership"]);

  const body: PaymentsResponse = {
    payments: payments.map((p) => ({
      id: p.id,
      type: p.type,
      status: p.status,
      amountInr: p.amountPaidInr.toString(),
      actualPaymentDate: p.actualPaymentDate.toISOString(),
      coverageLabel: p.type === "MEMBERSHIP" ? `Membership ${p.membershipYear ?? ""}`.trim() : formatMonthsCovered(p.monthsCovered),
      meetingTitle: p.meeting?.title ?? null,
      reviewRemarks: p.reviewRemarks,
      createdAt: p.createdAt.toISOString(),
    })),
    thisMonth: { label: formatMonthYear(summary.thisMonth), status: summary.thisMonthStatus },
    paidThrough: summary.paidThrough ? formatMonthYear(summary.paidThrough) : null,
    nextUnpaidMonth: summary.startMonth,
    membership: { year: summary.today.year, status: summary.membershipThisYear },
    membershipYears: summary.membershipYears,
    defaultMembershipYear: summary.defaultMembershipYear,
    fees: {
      monthlyMeeting: monthlyFee ? `${withGst(monthlyFee)} per month` : null,
      annualMembership: annualFee ? `${annualFee.withGst} (${annualFee.total} per year incl. GST)` : null,
    },
    meetingPayee: {
      qrCodeUrl: content["payment.qrCodeUrl"],
      upiId: content["payment.upiId"],
      bankName: content["payment.bankName"],
      accountName: content["payment.bankAccountName"],
      accountNumber: content["payment.bankAccountNumber"],
      ifsc: content["payment.bankIfsc"],
    },
    membershipPayee: {
      qrCodeUrl: content["payment.membershipQrCodeUrl"],
      upiId: content["payment.membershipUpiId"],
      bankName: content["payment.membershipBankName"],
      accountName: content["payment.membershipBankAccountName"],
      accountNumber: content["payment.membershipBankAccountNumber"],
      ifsc: content["payment.membershipBankIfsc"],
    },
    uploadsEnabled: isStorageConfigured(),
    monthGrid: buildMonthGrid(payments, member.joinedAt),
    feeQuote: {
      monthlyMeetingInr: parseFee(content["fees.monthlyMeeting"]),
      gstPercent: MEETING_FEE_GST_PERCENT,
      membershipTotalInr: quoteMembershipFee(parseFee(content["fees.annualMembership"])),
    },
  };
  return json(body);
});

const typeSchema = z.object({ type: z.enum(["MEETING", "MEMBERSHIP"], "Choose what this payment is for.") });

/**
 * Submits a payment for approval. Body: type, idempotencyKey, amountPaidInr,
 * actualPaymentDate, proofUrl, plus numberOfMonths + month_i/year_i for a
 * meeting payment or membershipYear for membership — the same fields the
 * web form posts.
 */
export const POST = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const body = await request.json().catch(() => null);
  const parsedType = typeSchema.safeParse(body);
  if (!parsedType.success) throw invalid(parsedType.error.issues[0]?.message ?? "Invalid request.");

  // The app always uploads through /uploads/payment-proof — refuse any
  // other URL rather than storing an arbitrary link as "proof".
  const fields = fieldsFromJson(body);
  const proofUrl = fields.get("proofUrl");
  if (typeof proofUrl === "string" && proofUrl && !isOwnStorageUrl(proofUrl, "paymentProof")) {
    throw invalid("Upload the payment proof from the app.");
  }

  const result = await submitMemberPaymentFor(member.id, parsedType.data.type, fields);
  if (result.error) throw invalid(result.error);
  return json({ ok: true }, 201);
});
