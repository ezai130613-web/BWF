import Link from "next/link";
import { getChapterScope, getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import type { Prisma, PaymentApprovalStatus } from "@/generated/prisma/client";
import { VisitorPaymentReviewActions } from "@/components/admin/visitor-payment-review-actions";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/**
 * Visitors Payment — deliberately its own dashboard, separate from Payment
 * Management (member payments) and Visitors Attendance (spec §4: "Keep this
 * dashboard separate from Member Payments and Visitor Attendance").
 */
export default async function VisitorsPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string; meetingId?: string; status?: string; q?: string }>;
}) {
  const scope = await getChapterScope("payments:view");
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  const canApprove = permissions.has("payments:approve");

  const params = await searchParams;

  const chapters = scope === "ALL" ? await db.chapter.findMany({ orderBy: { name: "asc" } }) : [];
  const effectiveChapterId = scope === "ALL" ? params.chapterId : scope;

  const attendanceFilter: Prisma.VisitorAttendanceWhereInput = {
    ...(effectiveChapterId ? { chapterId: effectiveChapterId } : {}),
    ...(params.meetingId ? { meetingId: params.meetingId } : {}),
    ...(params.q ? { visitorProfile: { name: { contains: params.q, mode: "insensitive" } } } : {}),
  };

  const where: Prisma.VisitorPaymentWhereInput = {
    visitorAttendance: attendanceFilter,
    ...(params.status ? { status: params.status as PaymentApprovalStatus } : {}),
  };

  const [payments, summary, meetings] = await Promise.all([
    db.visitorPayment.findMany({
      where,
      include: { visitorAttendance: { include: { visitorProfile: true, chapter: true, meeting: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.visitorPayment.groupBy({
      by: ["status"],
      where: effectiveChapterId ? { visitorAttendance: { chapterId: effectiveChapterId } } : {},
      _sum: { amountInr: true },
    }),
    effectiveChapterId ? db.meeting.findMany({ where: { chapterId: effectiveChapterId }, orderBy: { startsAt: "desc" } }) : [],
  ]);

  const sumFor = (statuses: string[]) =>
    summary.filter((s) => statuses.includes(s.status)).reduce((total, s) => total + Number(s._sum.amountInr ?? 0), 0);

  const totalSubmitted = sumFor(["PENDING_APPROVAL", "APPROVED", "REJECTED", "CLARIFICATION_REQUESTED"]);
  const approvedValue = sumFor(["APPROVED"]);
  const pendingValue = sumFor(["PENDING_APPROVAL", "CLARIFICATION_REQUESTED"]);
  const rejectedValue = sumFor(["REJECTED"]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Visitors Payment</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Visitor meeting payment submissions — independent of Visitors Attendance and Member
            Payments. Pending submissions are never counted as verified receipts.
          </p>
        </div>
        <Link href="/api/admin/exports/visitor-payments" className="text-sm text-neutral-600 underline hover:text-neutral-900">
          Export Excel
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Submitted" value={money.format(totalSubmitted)} />
        <StatCard label="Approved" value={money.format(approvedValue)} tone="emerald" />
        <StatCard label="Pending" value={money.format(pendingValue)} tone="amber" />
        <StatCard label="Rejected" value={money.format(rejectedValue)} tone="red" />
      </div>

      <form action="/admin/visitors-payment" method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        {scope === "ALL" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Chapter
            <select name="chapterId" defaultValue={params.chapterId ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
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
          <select name="meetingId" defaultValue={params.meetingId ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All meetings</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Visitor
          <input name="q" defaultValue={params.q} placeholder="Search name…" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Status
          <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLARIFICATION_REQUESTED">Clarification Requested</option>
          </select>
        </label>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Apply
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {payments.map((payment) => (
          <div key={payment.id} className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {payment.visitorAttendance.visitorProfile.name} · {payment.visitorAttendance.chapter.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {payment.visitorAttendance.meeting.title} —{" "}
                  {payment.visitorAttendance.meeting.startsAt.toLocaleDateString("en-IN")}
                </p>
              </div>
              <StatusBadge status={payment.status} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-neutral-500">Amount</dt>
                <dd className="font-medium text-neutral-900">{money.format(Number(payment.amountInr))}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Payment date</dt>
                <dd className="text-neutral-900">{payment.actualPaymentDate.toLocaleDateString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Submitted</dt>
                <dd className="text-neutral-900">{payment.createdAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-600 underline hover:text-neutral-900">
                View proof
              </a>
              {payment.reviewRemarks ? <p className="text-xs text-neutral-500">Remarks: {payment.reviewRemarks}</p> : null}
            </div>

            {canApprove ? <VisitorPaymentReviewActions visitorPaymentId={payment.id} status={payment.status} /> : null}
          </div>
        ))}
        {payments.length === 0 ? (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-400">
            No visitor payment submissions match these filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" | "red" }) {
  const toneClass = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-700" : "text-neutral-900";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
