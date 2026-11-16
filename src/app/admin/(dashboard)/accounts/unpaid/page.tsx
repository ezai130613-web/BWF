import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getUnpaidRows, parseUnpaidFilters } from "@/lib/accounts/unpaid";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { ReportDownloads } from "@/components/admin/report-downloads";

const SHOW_LIMIT = 500;
const field = "rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900";

/**
 * 2026-11-17 client request — members who have not paid, chapter + month
 * wise, for a from/to date range, downloadable as Excel or PDF.
 */
export default async function UnpaidMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string; month?: string; from?: string; to?: string; pending?: string }>;
}) {
  await requirePermission("accounts:view");
  const filters = parseUnpaidFilters(await searchParams);
  const [rows, chapters] = await Promise.all([getUnpaidRows(filters), db.chapter.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })]);

  const byChapter = new Map<string, { members: Set<string>; items: number }>();
  for (const r of rows) {
    const c = byChapter.get(r.chapter) ?? { members: new Set<string>(), items: 0 };
    c.members.add(r.memberId);
    c.items++;
    byChapter.set(r.chapter, c);
  }
  const downloadParams = { chapterId: filters.chapterId, from: filters.from, to: filters.to, pending: filters.includePending ? "1" : undefined };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Members who have not paid
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Active members with no <em>approved</em> payment for a month (meeting fee) or year (annual membership) in the range. Months before a member was
            added to the system, and months that haven&rsquo;t started, are left out — payments made outside the system earlier can&rsquo;t be known.
          </p>
        </div>
        <ReportDownloads report="unpaid-members" params={downloadParams} />
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Chapter
          <select name="chapterId" defaultValue={filters.chapterId ?? ""} className={field}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Month
          <input type="month" name="month" defaultValue={filters.month} className={field} />
        </label>
        <span className="pb-2 text-xs text-neutral-400">or</span>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          From date
          <input type="date" name="from" defaultValue={filters.month ? "" : filters.from} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          To date
          <input type="date" name="to" defaultValue={filters.month ? "" : filters.to} className={field} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700">
          <input type="checkbox" name="pending" value="1" defaultChecked={filters.includePending} className="h-4 w-4 accent-emerald-800" />
          Include payments awaiting approval
        </label>
        <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          Apply
        </button>
        <Link href="/admin/accounts/unpaid" className="pb-2 text-sm text-neutral-500 underline hover:text-emerald-800">
          Reset
        </Link>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...byChapter.entries()].map(([name, c]) => (
          <div key={name} className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">{name}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{c.members.size}</p>
            <p className="text-xs text-neutral-500">members · {c.items} unpaid item(s)</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {["Chapter", "Member", "Phone", "Category", "Fee", "Period", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.slice(0, SHOW_LIMIT).map((r, i) => (
              <tr key={`${r.memberId}-${r.kind}-${r.period}-${i}`}>
                <td className="px-4 py-2.5 text-neutral-600">{r.chapter}</td>
                <td className="px-4 py-2.5 font-medium text-neutral-900">{r.member}</td>
                <td className="px-4 py-2.5 text-neutral-600">{r.phone || "—"}</td>
                <td className="px-4 py-2.5 text-neutral-600">{r.category}</td>
                <td className="px-4 py-2.5 text-neutral-600">{r.kind}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-neutral-600">{r.period}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "Not paid" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{r.status}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                  Nobody is unpaid for this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.length > SHOW_LIMIT ? <p className="text-xs text-neutral-500">Showing the first {SHOW_LIMIT} of {rows.length} — the downloads include everything.</p> : null}
    </div>
  );
}
