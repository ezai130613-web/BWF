import { db } from "@/lib/db";
import { formatMonthsCovered } from "@/lib/attendance/manage";
import type { Prisma, PaymentApprovalStatus } from "@/generated/prisma/client";

/**
 * Phase 29 — Accounts workspace ledger. Member `Payment` and `VisitorPayment`
 * stay two separate tables (Phase 22/23's "keep visitor records separate"
 * rule); this only merges them at read time into one uniform row shape so
 * the Accounts Department sees every rupee in one list. Shared by
 * /admin/accounts and its Excel export so the two can never disagree.
 */

export type LedgerType = "MEMBER" | "VISITOR";

export type LedgerFilters = {
  type?: LedgerType;
  status?: PaymentApprovalStatus;
  chapterId?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type LedgerRow = {
  id: string;
  type: LedgerType;
  payerName: string;
  payerContact: string | null;
  chapterName: string;
  meetingTitle: string;
  meetingDate: Date;
  purpose: string;
  amountInr: number;
  paymentDate: Date;
  submittedAt: Date;
  status: PaymentApprovalStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewRemarks: string | null;
  proofUrl: string;
};

const STATUSES: PaymentApprovalStatus[] = ["PENDING_APPROVAL", "APPROVED", "REJECTED", "CLARIFICATION_REQUESTED"];

export const STATUS_LABELS: Record<PaymentApprovalStatus, string> = {
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLARIFICATION_REQUESTED: "Clarification Requested",
};

/** Validates raw query-string values into filters — anything unrecognised is dropped rather than passed to Prisma. */
export function parseLedgerFilters(params: Record<string, string | undefined>): LedgerFilters {
  const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    type: params.type === "MEMBER" || params.type === "VISITOR" ? params.type : undefined,
    status: STATUSES.includes(params.status as PaymentApprovalStatus) ? (params.status as PaymentApprovalStatus) : undefined,
    chapterId: params.chapterId || undefined,
    q: params.q?.trim() || undefined,
    from: isDate(params.from),
    to: isDate(params.to),
  };
}

function paymentDateRange(filters: LedgerFilters) {
  if (!filters.from && !filters.to) return undefined;
  // `to` is inclusive of the whole day, so compare against the next midnight.
  const toExclusive = filters.to ? new Date(new Date(filters.to).getTime() + 24 * 60 * 60 * 1000) : undefined;
  return {
    ...(filters.from ? { gte: new Date(filters.from) } : {}),
    ...(toExclusive ? { lt: toExclusive } : {}),
  };
}

function memberWhere(filters: LedgerFilters, includeStatus: boolean): Prisma.PaymentWhereInput {
  const dateRange = paymentDateRange(filters);
  return {
    member: {
      ...(filters.chapterId ? { chapterId: filters.chapterId } : {}),
      ...(filters.q ? { name: { contains: filters.q, mode: "insensitive" } } : {}),
    },
    ...(includeStatus && filters.status ? { status: filters.status } : {}),
    ...(dateRange ? { actualPaymentDate: dateRange } : {}),
  };
}

function visitorWhere(filters: LedgerFilters, includeStatus: boolean): Prisma.VisitorPaymentWhereInput {
  const dateRange = paymentDateRange(filters);
  return {
    visitorAttendance: {
      ...(filters.chapterId ? { chapterId: filters.chapterId } : {}),
      ...(filters.q
        ? {
            visitorProfile: {
              OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { phone: { contains: filters.q } }],
            },
          }
        : {}),
    },
    ...(includeStatus && filters.status ? { status: filters.status } : {}),
    ...(dateRange ? { actualPaymentDate: dateRange } : {}),
  };
}

/** Newest-submitted first. `limit` caps each source before merging (the page passes one; the export doesn't). */
export async function getLedgerRows(filters: LedgerFilters, limit?: number): Promise<LedgerRow[]> {
  const [memberPayments, visitorPayments] = await Promise.all([
    filters.type === "VISITOR"
      ? []
      : db.payment.findMany({
          where: memberWhere(filters, true),
          include: { member: { include: { chapter: true } }, meeting: true },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
    filters.type === "MEMBER"
      ? []
      : db.visitorPayment.findMany({
          where: visitorWhere(filters, true),
          include: { visitorAttendance: { include: { visitorProfile: true, chapter: true, meeting: true } } },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
  ]);

  const reviewerIds = [...new Set([...memberPayments, ...visitorPayments].map((p) => p.reviewedByUserId).filter((id): id is string => !!id))];
  const reviewers = reviewerIds.length
    ? await db.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true, email: true } })
    : [];
  const reviewerName = (id: string | null) => {
    if (!id) return null;
    const user = reviewers.find((u) => u.id === id);
    return user ? user.name || user.email : "Unknown user";
  };

  const rows: LedgerRow[] = [
    ...memberPayments.map((p) => ({
      id: p.id,
      type: "MEMBER" as const,
      payerName: p.member.name,
      payerContact: p.member.phone,
      chapterName: p.member.chapter.name,
      meetingTitle: p.meeting.title,
      meetingDate: p.meeting.startsAt,
      purpose: `Membership fee — ${formatMonthsCovered(p.monthsCovered) || `${p.numberOfMonths} month(s)`}`,
      amountInr: Number(p.amountPaidInr),
      paymentDate: p.actualPaymentDate,
      submittedAt: p.createdAt,
      status: p.status,
      reviewedBy: reviewerName(p.reviewedByUserId),
      reviewedAt: p.reviewedAt,
      reviewRemarks: p.reviewRemarks,
      proofUrl: p.proofUrl,
    })),
    ...visitorPayments.map((p) => ({
      id: p.id,
      type: "VISITOR" as const,
      payerName: p.visitorAttendance.visitorProfile.name,
      payerContact: p.visitorAttendance.visitorProfile.phone,
      chapterName: p.visitorAttendance.chapter.name,
      meetingTitle: p.visitorAttendance.meeting.title,
      meetingDate: p.visitorAttendance.meeting.startsAt,
      purpose: "Visitor meeting fee",
      amountInr: Number(p.amountInr),
      paymentDate: p.actualPaymentDate,
      submittedAt: p.createdAt,
      status: p.status,
      reviewedBy: reviewerName(p.reviewedByUserId),
      reviewedAt: p.reviewedAt,
      reviewRemarks: p.reviewRemarks,
      proofUrl: p.proofUrl,
    })),
  ];

  rows.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  return limit ? rows.slice(0, limit) : rows;
}

export type LedgerSummary = Record<PaymentApprovalStatus, { count: number; amountInr: number }>;

/** Totals per status — honours every filter except status itself, so the cards always show the full picture for the selected chapter/type/dates. */
export async function getLedgerSummary(filters: LedgerFilters): Promise<LedgerSummary> {
  const [memberGroups, visitorGroups] = await Promise.all([
    filters.type === "VISITOR"
      ? []
      : db.payment.groupBy({ by: ["status"], where: memberWhere(filters, false), _sum: { amountPaidInr: true }, _count: true }),
    filters.type === "MEMBER"
      ? []
      : db.visitorPayment.groupBy({ by: ["status"], where: visitorWhere(filters, false), _sum: { amountInr: true }, _count: true }),
  ]);

  const summary = Object.fromEntries(STATUSES.map((s) => [s, { count: 0, amountInr: 0 }])) as LedgerSummary;
  for (const g of memberGroups) {
    summary[g.status].count += g._count;
    summary[g.status].amountInr += Number(g._sum.amountPaidInr ?? 0);
  }
  for (const g of visitorGroups) {
    summary[g.status].count += g._count;
    summary[g.status].amountInr += Number(g._sum.amountInr ?? 0);
  }
  return summary;
}
