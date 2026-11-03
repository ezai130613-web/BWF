import { z } from "zod";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { formatAnnualMembershipFee } from "@/lib/format";
import { formatMonthYear, formatMonthsCovered } from "@/lib/attendance/manage";
import { fieldsFromJson } from "@/lib/payments/member-payments";
import { buildMonthGrid, summarizeMemberPayments } from "@/lib/payments/overview";
import { MEETING_FEE_GST_PERCENT, packagesSummary, parseFee, quoteMeetings, quoteMembershipFee } from "@/lib/payments/fees";
import { getMeetingPackages } from "@/lib/payments/packages";
import { submitMemberPaymentFor } from "@/lib/payments/submit";
import { formatDateKey, getMemberPaymentContext, paymentCoverageLabel } from "@/lib/payments/coverage";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { isOwnStorageUrl, isStorageConfigured } from "@/lib/storage";
import { invalid, json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { PaymentsResponse } from "@/lib/mobile/contract";

const PAYEE_KEYS = [
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
  const [payments, content, context, packages] = await Promise.all([
    db.payment.findMany({ where: { memberId: member.id }, include: { meeting: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    getContent(PAYEE_KEYS),
    getMemberPaymentContext(member.id),
    getMeetingPackages(),
  ]);
  const { dues } = context;
  const dueItems: string[] = [];
  if (dues.nextMeeting && dues.nextMeeting.status === null) {
    dueItems.push(`Meeting fee — next meeting ${formatDateKey(dues.nextMeeting.date)}; pay by ${formatDateKey(dues.nextMeeting.payBy)}.`);
  }
  if (dues.membership.status === null) dueItems.push(`Annual BWF membership for ${dues.membership.year}.`);
  const summary = summarizeMemberPayments(payments);
  const annualFee = formatAnnualMembershipFee(content["fees.annualMembership"]);

  const body: PaymentsResponse = {
    payments: payments.map((p) => ({
      id: p.id,
      type: p.type,
      status: p.status,
      amountInr: p.amountPaidInr.toString(),
      actualPaymentDate: p.actualPaymentDate.toISOString(),
      coverageLabel: paymentCoverageLabel(p, formatMonthsCovered),
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
      monthlyMeeting: packagesSummary(packages),
      annualMembership: annualFee ? `${annualFee.base} + GST per year` : null,
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
      // Meeting fees are packages now (meetingPackages); null so older app builds don't show a per-month price.
      monthlyMeetingInr: null,
      gstPercent: MEETING_FEE_GST_PERCENT,
      membershipTotalInr: quoteMembershipFee(parseFee(content["fees.annualMembership"])),
      membershipFeeInr: parseFee(content["fees.annualMembership"]),
    },
    dues: dueItems.length ? { title: `Hi ${member.name.split(" ")[0]}, you're due for payment`, items: dueItems } : null,
    meetingGrid: context.tiles,
    upcomingUnpaid: context.upcoming,
    meetingsPerMonth: context.perMonth,
    meetingPackages: packages.map((p) => {
      const q = quoteMeetings(p.meetings, packages)!;
      return { meetings: p.meetings, priceInr: q.subtotal, originalInr: q.original, discountInr: q.discount, gstInr: q.gst, totalInr: q.total };
    }),
    onlinePayments: isRazorpayConfigured(),
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
