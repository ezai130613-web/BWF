import Link from "next/link";
import { getPaymentsScope, getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatMonthsCovered } from "@/lib/attendance/manage";
import { PaymentReviewActions } from "@/components/admin/payment-review-actions";
import type { Prisma, PaymentApprovalStatus } from "@/generated/prisma/client";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { AdminRemarksSummary } from "@/components/admin/admin-remarks";
import { getRemarksForMembers } from "@/lib/remarks";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string; meetingId?: string; status?: string; type?: string; from?: string; to?: string; q?: string }>;
}) {
  const scope = await getPaymentsScope();
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  const canApprove = permissions.has("payments:approve");

  const params = await searchParams;

  const chapters = scope === "ALL" ? await db.chapter.findMany({ orderBy: { name: "asc" } }) : [];
  const effectiveChapterId = scope === "ALL" ? params.chapterId : scope;

  const where: Prisma.PaymentWhereInput = {
    ...(effectiveChapterId ? { member: { chapterId: effectiveChapterId } } : {}),
    ...(params.meetingId ? { meetingId: params.meetingId } : {}),
    ...(params.status ? { status: params.status as PaymentApprovalStatus } : {}),
    ...(params.type === "MEETING" || params.type === "MEMBERSHIP" ? { type: params.type } : {}),
    ...(params.q ? { member: { ...(effectiveChapterId ? { chapterId: effectiveChapterId } : {}), name: { contains: params.q, mode: "insensitive" } } } : {}),
    ...(params.from || params.to
      ? {
          actualPaymentDate: {
            ...(params.from ? { gte: new Date(params.from) } : {}),
            ...(params.to ? { lte: new Date(params.to) } : {}),
          },
        }
      : {}),
  };

  const [payments, summary, meetings] = await Promise.all([
    db.payment.findMany({
      where,
      include: { member: { include: { chapter: true } }, meeting: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.payment.groupBy({
      by: ["status"],
      where: effectiveChapterId ? { member: { chapterId: effectiveChapterId } } : {},
      _sum: { amountPaidInr: true },
    }),
    effectiveChapterId ? db.meeting.findMany({ where: { chapterId: effectiveChapterId }, orderBy: { startsAt: "desc" } }) : [],
  ]);

  // Renewal context: annual membership payments show the member's admin remarks.
  const remarksByMember = await getRemarksForMembers([
    ...new Set(payments.filter((p) => p.type === "MEMBERSHIP").map((p) => p.memberId)),
  ]);

  const sumFor = (statuses: string[]) =>
    summary.filter((s) => statuses.includes(s.status)).reduce((total, s) => total + Number(s._sum.amountPaidInr ?? 0), 0);

  const totalSubmitted = sumFor(["PENDING_APPROVAL", "APPROVED", "REJECTED", "CLARIFICATION_REQUESTED"]);
  const approvedValue = sumFor(["APPROVED"]);
  const pendingValue = sumFor(["PENDING_APPROVAL", "CLARIFICATION_REQUESTED"]);
  const rejectedValue = sumFor(["REJECTED"]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Payment Management</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Member payment submissions — monthly meeting fees (at check-in or from the member portal) and
            annual membership. Independent of attendance. Pending submissions are never counted as
            verified receipts.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/payments/links" className="text-sm text-neutral-600 underline hover:text-emerald-800">
            Payment links
          </Link>
          <Link href="/api/admin/exports/payments" className="text-sm text-neutral-600 underline hover:text-emerald-800">
            Export Excel
          </Link>
          <Link href="/admin/payments/members" className="text-sm text-neutral-600 underline hover:text-emerald-800">
            Member-wise view →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Submitted" value={money.format(totalSubmitted)} />
        <StatCard label="Approved" value={money.format(approvedValue)} tone="emerald" />
        <StatCard label="Pending" value={money.format(pendingValue)} tone="amber" />
        <StatCard label="Rejected" value={money.format(rejectedValue)} tone="red" />
      </div>

      <form action="/admin/payments" method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-4">
        {scope === "ALL" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Chapter
            <select name="chapterId" defaultValue={params.chapterId ?? ""} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="">All chapters</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Meeting
          <select name="meetingId" defaultValue={params.meetingId ?? ""} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All meetings</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Member
          <input name="q" defaultValue={params.q} placeholder="Search name…" className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Type
          <select name="type" defaultValue={params.type ?? ""} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="MEETING">Meeting fee</option>
            <option value="MEMBERSHIP">Annual membership</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Status
          <select name="status" defaultValue={params.status ?? ""} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLARIFICATION_REQUESTED">Clarification Requested</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          From
          <input type="date" name="from" defaultValue={params.from} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          To
          <input type="date" name="to" defaultValue={params.to} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          Apply
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {payments.map((payment) => (
          <div key={payment.id} className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {payment.member.name} · {payment.member.chapter.name}
                </p>
                <p className="text-xs text-neutral-500">
                  <span className={payment.type === "MEMBERSHIP" ? "font-medium text-indigo-700" : "font-medium text-emerald-700"}>
                    {payment.type === "MEMBERSHIP" ? "Annual membership" : "Meeting fee"}
                  </span>
                  {" · "}
                  {payment.meeting
                    ? `At check-in: ${payment.meeting.title} — ${payment.meeting.startsAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`
                    : "Paid from member portal"}
                </p>
              </div>
              <StatusBadge status={payment.status} overlap={payment.overlapsApprovedCoverage} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-neutral-500">Amount</dt>
                <dd className="font-medium text-neutral-900">{money.format(Number(payment.amountPaidInr))}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Months</dt>
                <dd className="text-neutral-900">{payment.type === "MEMBERSHIP" ? "—" : payment.numberOfMonths}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Covered</dt>
                <dd className="text-neutral-900">
                  {payment.type === "MEMBERSHIP" ? `Membership year ${payment.membershipYear}` : formatMonthsCovered(payment.monthsCovered)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Payment date</dt>
                <dd className="text-neutral-900">{payment.actualPaymentDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-600 underline hover:text-emerald-800">
                View proof
              </a>
              {payment.reviewRemarks ? <p className="text-xs text-neutral-500">Remarks: {payment.reviewRemarks}</p> : null}
            </div>

            {payment.type === "MEMBERSHIP" ? <AdminRemarksSummary remarks={remarksByMember.get(payment.memberId) ?? []} /> : null}

            {canApprove ? <PaymentReviewActions paymentId={payment.id} status={payment.status} type={payment.type} /> : null}
          </div>
        ))}
        {payments.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm px-4 py-8 text-center text-sm text-neutral-400">
            No payment submissions match these filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" | "red" }) {
  const toneClass = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-700" : "text-neutral-900";
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status, overlap }: { status: string; overlap: boolean }) {
  const styles: Record<string, string> = {
    PENDING_APPROVAL: "bg-amber-50 text-amber-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
    CLARIFICATION_REQUESTED: "bg-sky-50 text-sky-700",
  };
  const labels: Record<string, string> = {
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    CLARIFICATION_REQUESTED: "Clarification Requested",
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>
      {overlap ? <span className="text-xs font-medium text-orange-600">⚠ Overlaps approved coverage</span> : null}
    </div>
  );
}
