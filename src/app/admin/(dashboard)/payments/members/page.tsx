import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatMonthYear, formatMonthsCovered, parseMonthsCovered, type MonthYear } from "@/lib/attendance/manage";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Payment Management — member-wise history (spec: "submissions, dates, amounts, months, proof and status... month-by-month view distinguishing Approved, Pending and No approved payment recorded. Do not infer nonpayment from incomplete records."). */
export default async function PaymentMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; memberId?: string }>;
}) {
  const scope = await getChapterScope("payments:view");
  const params = await searchParams;

  if (!params.memberId) {
    const members = params.q
      ? await db.member.findMany({
          where: {
            status: "ACTIVE",
            ...(scope !== "ALL" ? { chapterId: scope } : {}),
            name: { contains: params.q, mode: "insensitive" },
          },
          include: { chapter: true },
          orderBy: { name: "asc" },
          take: 25,
        })
      : [];

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">Payments — Member-wise View</h1>
          <Link href="/admin/payments" className="text-sm text-neutral-600 underline hover:text-neutral-900">
            ← Payment list
          </Link>
        </div>
        <form action="/admin/payments/members" method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search member by name…"
            className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
          <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Search
          </button>
        </form>
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                <p className="text-xs text-neutral-500">{member.chapter.name}</p>
              </div>
              <Link
                href={`/admin/payments/members?memberId=${member.id}`}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
              >
                View history
              </Link>
            </li>
          ))}
          {members.length === 0 && params.q ? <li className="px-4 py-8 text-center text-sm text-neutral-400">No members matched.</li> : null}
        </ul>
      </div>
    );
  }

  const member = await db.member.findUnique({ where: { id: params.memberId }, include: { chapter: true } });
  if (!member || (scope !== "ALL" && member.chapterId !== scope)) {
    return <p className="text-sm text-red-600">You don&rsquo;t have access to this member.</p>;
  }

  const payments = await db.payment.findMany({
    where: { memberId: member.id },
    include: { meeting: true },
    orderBy: { createdAt: "desc" },
  });

  // Month-by-month coverage since joining, capped at the current month —
  // "Do not infer nonpayment from incomplete records" means a month simply
  // reads "No approved payment recorded", never a fabricated "Unpaid".
  const monthGrid: { key: string; label: string; approved: boolean; pending: boolean }[] = [];
  const cursor = new Date(member.joinedAt.getFullYear(), member.joinedAt.getMonth(), 1);
  const end = new Date();
  const approvedMonths = new Set<string>();
  const pendingMonths = new Set<string>();
  for (const p of payments) {
    const months = parseMonthsCovered(p.monthsCovered);
    for (const m of months) {
      const key = `${m.year}-${m.month}`;
      if (p.status === "APPROVED") approvedMonths.add(key);
      else if (p.status === "PENDING_APPROVAL" || p.status === "CLARIFICATION_REQUESTED") pendingMonths.add(key);
    }
  }
  while (cursor <= end) {
    const my: MonthYear = { month: cursor.getMonth() + 1, year: cursor.getFullYear() };
    const key = `${my.year}-${my.month}`;
    monthGrid.push({ key, label: formatMonthYear(my), approved: approvedMonths.has(key), pending: pendingMonths.has(key) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/payments/members" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Search a different member
      </Link>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">{member.name}</h2>
        <p className="text-sm text-neutral-600">{member.chapter.name}</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Month-by-month coverage</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {monthGrid.map((m) => (
            <span
              key={m.key}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                m.approved ? "bg-emerald-50 text-emerald-700" : m.pending ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-500"
              }`}
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
          <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-neutral-900">{p.meeting.title}</p>
              <span className="text-xs font-medium text-neutral-500">{p.status.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-1 text-neutral-600">
              {money.format(Number(p.amountPaidInr))} · {formatMonthsCovered(p.monthsCovered)} · paid{" "}
              {p.actualPaymentDate.toLocaleDateString("en-IN")}
            </p>
            <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-neutral-500 underline">
              View proof
            </a>
          </div>
        ))}
        {payments.length === 0 ? (
          <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-400">
            No payment submissions from this member yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
