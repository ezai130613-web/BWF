import { db } from "@/lib/db";
import { formatMonthsCovered } from "@/lib/attendance/manage";
import { getLedgerRows, parseLedgerFilters, STATUS_LABELS } from "@/lib/accounts/ledger";
import { blanket, effectiveChapterId, istDayEnd, istDayStart, paymentsScope } from "../access";
import type { ExportDataset } from "./types";
import type { ExportColumn } from "../workbook";
import type { Prisma, PaymentApprovalStatus } from "@/generated/prisma/client";

/**
 * Payment downloads exist mainly for proof verification (client, 2026-10-26):
 * every row carries a clickable "Open proof" link to the uploaded
 * screenshot/PDF, next to the amount, date and review status.
 */

function parseStatus(value: string | null): PaymentApprovalStatus | undefined {
  return value && value in STATUS_LABELS ? (value as PaymentApprovalStatus) : undefined;
}

async function reviewerNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const users = await db.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

const REVIEW_COLUMNS: ExportColumn[] = [
  { header: "Status", key: "status", width: 22 },
  { header: "Reviewed By", key: "reviewedBy", width: 20 },
  { header: "Reviewed On", key: "reviewedAt", type: "datetime", width: 20 },
  { header: "Review Remarks", key: "remarks", width: 30 },
  { header: "Proof", key: "proof", type: "link", linkText: "Open proof", width: 14 },
  { header: "Proof URL", key: "proofUrl", width: 50 },
];

/** Same filters as /admin/payments (+ memberId for the member-wise view). */
const payments: ExportDataset = {
  key: "payments",
  title: "Member Payments",
  scope: paymentsScope,
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const meetingId = params.get("meetingId") || undefined;
    const memberId = params.get("memberId") || undefined;
    const q = params.get("q")?.trim() || undefined;
    const status = parseStatus(params.get("status"));
    const type = params.get("type");
    const from = istDayStart(params.get("from"));
    const to = istDayEnd(params.get("to"));

    const where: Prisma.PaymentWhereInput = {
      AND: [
        chapterId ? { member: { chapterId } } : {},
        meetingId ? { meetingId } : {},
        memberId ? { memberId } : {},
        q ? { member: { name: { contains: q, mode: "insensitive" } } } : {},
        status ? { status } : {},
        type === "MEETING" || type === "MEMBERSHIP" ? { type } : {},
        from || to ? { actualPaymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {},
      ],
    };

    const rows = await db.payment.findMany({
      where,
      include: { member: { include: { chapter: true, category: true } }, meeting: true },
      orderBy: { createdAt: "desc" },
    });
    const reviewers = await reviewerNames(rows.map((r) => r.reviewedByUserId));

    return [
      {
        name: "Member Payments",
        columns: [
          { header: "Submitted", key: "submitted", type: "datetime", width: 20 },
          { header: "Payment Date", key: "paymentDate", type: "date", width: 14 },
          { header: "Member", key: "member", width: 26 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Category", key: "category", width: 24 },
          { header: "Type", key: "type", width: 18 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Meeting Date", key: "meetingDate", type: "date", width: 14 },
          { header: "Amount (INR)", key: "amount", type: "money", width: 14 },
          { header: "Expected (INR)", key: "expected", type: "money", width: 14 },
          { header: "Months", key: "months", type: "number" },
          { header: "Covers", key: "covers", width: 30 },
          { header: "Overlaps Paid Months", key: "overlap" },
          ...REVIEW_COLUMNS,
        ],
        rows: rows.map((p) => ({
          submitted: p.createdAt,
          paymentDate: p.actualPaymentDate,
          member: p.member.name,
          phone: p.member.phone,
          chapter: p.member.chapter.name,
          category: p.member.category.name,
          type: p.type === "MEMBERSHIP" ? "Annual membership" : "Meeting fee",
          meeting: p.meeting?.title ?? "Member portal / app",
          meetingDate: p.meeting?.startsAt,
          amount: Number(p.amountPaidInr),
          expected: p.expectedAmountInr === null ? null : Number(p.expectedAmountInr),
          months: p.type === "MEMBERSHIP" ? null : p.numberOfMonths,
          covers: p.type === "MEMBERSHIP" ? `Membership year ${p.membershipYear ?? ""}`.trim() : formatMonthsCovered(p.monthsCovered),
          overlap: p.overlapsApprovedCoverage,
          status: STATUS_LABELS[p.status],
          reviewedBy: p.reviewedByUserId ? (reviewers.get(p.reviewedByUserId) ?? "Unknown") : null,
          reviewedAt: p.reviewedAt,
          remarks: p.reviewRemarks,
          proof: p.proofUrl,
          proofUrl: p.proofUrl,
        })),
      },
    ];
  },
};

/** Same filters as /admin/visitors-payment. */
const visitorPayments: ExportDataset = {
  key: "visitor-payments",
  title: "Visitor Payments",
  scope: paymentsScope,
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const meetingId = params.get("meetingId") || undefined;
    const q = params.get("q")?.trim() || undefined;
    const status = parseStatus(params.get("status"));

    const rows = await db.visitorPayment.findMany({
      where: {
        AND: [
          chapterId ? { visitorAttendance: { chapterId } } : {},
          meetingId ? { visitorAttendance: { meetingId } } : {},
          q ? { visitorAttendance: { visitorProfile: { name: { contains: q, mode: "insensitive" } } } } : {},
          status ? { status } : {},
        ],
      },
      include: {
        visitorAttendance: {
          include: { visitorProfile: true, chapter: true, meeting: true, invitingMember: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const reviewers = await reviewerNames(rows.map((r) => r.reviewedByUserId));

    return [
      {
        name: "Visitor Payments",
        columns: [
          { header: "Submitted", key: "submitted", type: "datetime", width: 20 },
          { header: "Payment Date", key: "paymentDate", type: "date", width: 14 },
          { header: "Visitor", key: "visitor", width: 24 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Company", key: "company", width: 24 },
          { header: "Invited By", key: "invitedBy", width: 22 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Meeting Date", key: "meetingDate", type: "date", width: 14 },
          { header: "Amount (INR)", key: "amount", type: "money", width: 14 },
          ...REVIEW_COLUMNS,
        ],
        rows: rows.map((p) => {
          const va = p.visitorAttendance;
          return {
            submitted: p.createdAt,
            paymentDate: p.actualPaymentDate,
            visitor: va.visitorProfile.name,
            phone: va.visitorProfile.phone,
            company: va.visitorProfile.companyName,
            invitedBy: va.invitingMember?.name,
            chapter: va.chapter.name,
            meeting: va.meeting.title,
            meetingDate: va.meeting.startsAt,
            amount: Number(p.amountInr),
            status: STATUS_LABELS[p.status],
            reviewedBy: p.reviewedByUserId ? (reviewers.get(p.reviewedByUserId) ?? "Unknown") : null,
            reviewedAt: p.reviewedAt,
            remarks: p.reviewRemarks,
            proof: p.proofUrl,
            proofUrl: p.proofUrl,
          };
        }),
      },
    ];
  },
};

/** /admin/accounts — the merged member + visitor ledger, same filters, no row cap. */
const accounts: ExportDataset = {
  key: "accounts",
  title: "All Payments",
  scope: (a) => blanket(a, "accounts:view"),
  // Every row is already in the member + visitor payment sheets.
  skipInAll: true,
  async load(_scope, params) {
    const rows = await getLedgerRows(parseLedgerFilters(Object.fromEntries(params)));
    return [
      {
        name: "All Payments",
        columns: [
          { header: "Submitted", key: "submitted", type: "datetime", width: 20 },
          { header: "Payment Date", key: "paymentDate", type: "date", width: 14 },
          { header: "Type", key: "type", width: 10 },
          { header: "Paid By", key: "payer", width: 24 },
          { header: "Contact", key: "contact", width: 16 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Purpose", key: "purpose", width: 40 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Meeting Date", key: "meetingDate", type: "date", width: 14 },
          { header: "Amount (INR)", key: "amount", type: "money", width: 14 },
          ...REVIEW_COLUMNS,
        ],
        rows: rows.map((r) => ({
          submitted: r.submittedAt,
          paymentDate: r.paymentDate,
          type: r.type === "MEMBER" ? "Member" : "Visitor",
          payer: r.payerName,
          contact: r.payerContact,
          chapter: r.chapterName,
          purpose: r.purpose,
          meeting: r.meetingTitle ?? "Member portal / app",
          meetingDate: r.meetingDate,
          amount: r.amountInr,
          status: STATUS_LABELS[r.status],
          reviewedBy: r.reviewedBy,
          reviewedAt: r.reviewedAt,
          remarks: r.reviewRemarks,
          proof: r.proofUrl,
          proofUrl: r.proofUrl,
        })),
      },
    ];
  },
};

export const PAYMENT_DATASETS = [payments, visitorPayments, accounts];
