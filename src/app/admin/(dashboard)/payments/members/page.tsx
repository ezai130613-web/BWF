import Link from "next/link";
import { getPaymentsScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatMonthYear, formatMonthsCovered, parseMonthsCovered, type MonthYear } from "@/lib/attendance/manage";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { istParts } from "@/lib/ist";
import { AdminRemarksList } from "@/components/admin/admin-remarks";
import { getMemberRemarks } from "@/lib/remarks";

/** Month-by-month grid window around the current month. */
const GRID_MONTHS_BEFORE = 3;
const GRID_MONTHS_AHEAD = 3;

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Payment Management — member-wise history (spec: "submissions, dates, amounts, months, proof and status... month-by-month view distinguishing Approved, Pending and No approved payment recorded. Do not infer nonpayment from incomplete records."). */
export default async function PaymentMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; chapterId?: string; categoryId?: string; memberId?: string }>;
}) {
  const scope = await getPaymentsScope();
  const params = await searchParams;

  if (!params.memberId) {
    // Chapter filter only makes sense for Super/Central Admin — a Chapter
    // Admin is already fixed to their own chapter via scope.
    const requestedChapterId = scope === "ALL" ? params.chapterId : scope;
    const hasFilter = Boolean(params.q || params.chapterId || params.categoryId);

    const [members, chapters, categories] = await Promise.all([
      hasFilter
        ? db.member.findMany({
            where: {
              status: "ACTIVE",
              ...(requestedChapterId ? { chapterId: requestedChapterId } : {}),
              ...(params.categoryId ? { categoryId: params.categoryId } : {}),
              ...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
            },
            include: { chapter: true, category: true },
            orderBy: { name: "asc" },
            take: 200,
          })
        : [],
      scope === "ALL" ? db.chapter.findMany({ orderBy: { name: "asc" } }) : [],
      db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    ]);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Payments — Member-wise View</h1>
          <Link href="/admin/payments" className="text-sm text-neutral-600 underline hover:text-emerald-800">
            ← Payment list
          </Link>
        </div>
        <form action="/admin/payments/members" method="GET" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Name
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search member by name…"
              className="w-full min-w-[16rem] rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
          </label>
          {scope === "ALL" ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Chapter
              <select name="chapterId" defaultValue={params.chapterId ?? ""} className="rounded-lg border border-neutral-300 px-2 py-2 text-sm">
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
            Category
            <select name="categoryId" defaultValue={params.categoryId ?? ""} className="rounded-lg border border-neutral-300 px-2 py-2 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
            Search
          </button>
        </form>
        <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                <p className="text-xs text-neutral-500">
                  {member.chapter.name} · {member.category.name}
                </p>
              </div>
              <Link
                href={`/admin/payments/members?memberId=${member.id}`}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
              >
                View history
              </Link>
            </li>
          ))}
          {members.length === 0 && hasFilter ? <li className="px-4 py-8 text-center text-sm text-neutral-400">No members matched.</li> : null}
        </ul>
      </div>
    );
  }

  const member = await db.member.findUnique({ where: { id: params.memberId }, include: { chapter: true } });
  if (!member || (scope !== "ALL" && member.chapterId !== scope)) {
    return <p className="text-sm text-red-600">You don&rsquo;t have access to this member.</p>;
  }

  const [payments, remarks] = await Promise.all([
    db.payment.findMany({
      where: { memberId: member.id },
      include: { meeting: true },
      orderBy: { createdAt: "desc" },
    }),
    getMemberRemarks(member.id),
  ]);

  // Month-by-month coverage from 3 months before to 3 months after the
  // current IST month (2026-10-21), stretched further ahead when a paid-in-
  // advance payment covers later months so it's never cut off —
  // "Do not infer nonpayment from incomplete records" means a month simply
  // reads "No approved payment recorded", never a fabricated "Unpaid".
  const monthGrid: { key: string; label: string; approved: boolean; pending: boolean; current: boolean }[] = [];
  const approvedMonths = new Set<string>();
  const pendingMonths = new Set<string>();
  // Months as a single index (year * 12 + 0-based month) for easy ranges.
  const now = istParts(new Date());
  const currentIndex = now.year * 12 + now.month;
  let endIndex = currentIndex + GRID_MONTHS_AHEAD;
  for (const p of payments) {
    if (p.type !== "MEETING") continue;
    const months = parseMonthsCovered(p.monthsCovered);
    for (const m of months) {
      const key = `${m.year}-${m.month}`;
      if (p.status === "APPROVED") approvedMonths.add(key);
      else if (p.status === "PENDING_APPROVAL" || p.status === "CLARIFICATION_REQUESTED") pendingMonths.add(key);
      else continue;
      endIndex = Math.max(endIndex, m.year * 12 + m.month - 1);
    }
  }
  for (let index = currentIndex - GRID_MONTHS_BEFORE; index <= endIndex; index++) {
    const my: MonthYear = { month: (index % 12) + 1, year: Math.floor(index / 12) };
    const key = `${my.year}-${my.month}`;
    monthGrid.push({
      key,
      label: formatMonthYear(my),
      approved: approvedMonths.has(key),
      pending: pendingMonths.has(key),
      current: index === currentIndex,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/payments/members" className="text-sm text-neutral-500 hover:text-emerald-800">
        ← Search a different member
      </Link>

      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-neutral-900">{member.name}</h2>
        <p className="text-sm text-neutral-600">{member.chapter.name}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Admin remarks</h3>
        <p className="mt-1 text-xs text-neutral-500">Internal — approval, renewal and general remarks. Never shown to the member.</p>
        <div className="mt-3">
          <AdminRemarksList remarks={remarks} />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Month-by-month coverage (meeting fee)</h3>
        <p className="mt-1 text-xs text-neutral-500">
          3 months back to 3 months ahead (further if paid in advance). Green = approved, amber = pending, grey = no
          approved payment recorded. Outlined = this month.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {monthGrid.map((m) => (
            <span
              key={m.key}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                m.approved ? "bg-emerald-50 text-emerald-700" : m.pending ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-500"
              } ${m.current ? "ring-2 ring-emerald-800/40" : ""}`}
              title={m.approved ? "Approved" : m.pending ? "Pending" : "No approved payment recorded"}
            >
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-neutral-900">Submissions</h3>
        {payments.map((p) => (
          <div key={p.id} className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-neutral-900">
                {p.type === "MEMBERSHIP" ? `Annual membership — ${p.membershipYear}` : "Meeting fee"}
                <span className="font-normal text-neutral-500">{p.meeting ? ` · at check-in: ${p.meeting.title}` : " · from member portal"}</span>
              </p>
              <span className="text-xs font-medium text-neutral-500">{p.status.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-1 text-neutral-600">
              {money.format(Number(p.amountPaidInr))}
              {p.type === "MEETING" ? ` · ${formatMonthsCovered(p.monthsCovered)}` : ""} · paid{" "}
              {p.actualPaymentDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
            <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-neutral-500 underline">
              View proof
            </a>
          </div>
        ))}
        {payments.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm px-4 py-8 text-center text-sm text-neutral-400">
            No payment submissions from this member yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
