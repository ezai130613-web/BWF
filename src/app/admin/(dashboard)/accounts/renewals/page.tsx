import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { SOON_MONTH_OPTIONS, getRenewalRows, parseRenewalFilters, type RenewalRow } from "@/lib/accounts/renewals";
import { AdminPageIcon } from "@/components/admin/page-icon";

const field = "rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900";
const fmtDate = (key: string) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/**
 * 2026-11-19 client request — annual membership renewal follow-up: members
 * already overdue (longest first) and members whose renewal is coming up
 * ("Due soon", within a chosen number of months), so next month's renewals
 * can be chased in advance.
 */
export default async function AnnualRenewalsPage({ searchParams }: { searchParams: Promise<{ chapterId?: string; show?: string; months?: string; pending?: string }> }) {
  await requirePermission("accounts:view");
  const filters = parseRenewalFilters(await searchParams);
  const [{ overdue, soon }, chapters] = await Promise.all([getRenewalRows(filters), db.chapter.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })]);

  const memberIds = [...overdue, ...soon].map((r) => r.memberId);
  const followUps = memberIds.length ? await db.paymentFollowUp.findMany({ where: { memberId: { in: memberIds } }, orderBy: { createdAt: "desc" } }) : [];
  const latest = new Map<string, { note: string; at: Date; count: number }>();
  for (const f of followUps) {
    const cur = latest.get(f.memberId);
    if (cur) cur.count++;
    else latest.set(f.memberId, { note: f.note, at: f.createdAt, count: 1 });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />
          Annual membership renewals
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Members whose annual fee is still to be paid. <strong>Overdue</strong> members have passed their due date (longest overdue first);{" "}
          <strong>Due soon</strong> members are coming up, so you can follow up before the date. Click a name to log a follow-up remark.
          Members whose payment is awaiting approval are hidden unless you switch the toggle on.
        </p>
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
          Show
          <select name="show" defaultValue={filters.show} className={field}>
            <option value="all">Overdue + Due soon</option>
            <option value="overdue">Already overdue only</option>
            <option value="soon">Due soon only</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Due soon: heading in the next
          <select name="months" defaultValue={String(filters.months)} className={field}>
            {SOON_MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} month{m > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-neutral-700">
          <input type="checkbox" name="pending" value="1" defaultChecked={filters.includePending} className="peer sr-only" />
          <span className="relative h-5 w-9 rounded-full bg-neutral-300 transition peer-checked:bg-emerald-700 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" aria-hidden />
          Show payments awaiting approval
        </label>
        <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          Apply
        </button>
        <Link href="/admin/accounts/renewals" className="pb-2 text-sm text-neutral-500 underline hover:text-emerald-800">
          Reset
        </Link>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500">Overdue</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{overdue.length}</p>
          <p className="text-xs text-neutral-500">members past their due date</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-neutral-500">Due soon</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{soon.length}</p>
          <p className="text-xs text-neutral-500">due in the next {filters.months} month{filters.months > 1 ? "s" : ""}</p>
        </div>
      </div>

      {filters.show !== "soon" ? (
        <Section title="Overdue" tone="red" rows={overdue} latest={latest} empty="No overdue renewals." />
      ) : null}
      {filters.show !== "overdue" ? (
        <Section title={`Due soon — next ${filters.months} month${filters.months > 1 ? "s" : ""}`} tone="amber" rows={soon} latest={latest} empty="No renewals coming up in this period." />
      ) : null}
    </div>
  );
}

function Section({ title, tone, rows, latest, empty }: { title: string; tone: "red" | "amber"; rows: RenewalRow[]; latest: Map<string, { note: string; at: Date; count: number }>; empty: string }) {
  const overdue = tone === "red";
  return (
    <section className="flex flex-col gap-2">
      <h2 className={`text-lg font-semibold ${overdue ? "text-red-800" : "text-amber-800"}`}>
        {title} <span className="text-sm font-normal text-neutral-500">({rows.length})</span>
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {["#", "Chapter", "Member", "Phone", "Category", overdue ? "Oldest unpaid term" : "Next term", "Due date", overdue ? "Overdue by" : "Due in", "Latest remark"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r, i) => {
              const l = latest.get(r.memberId);
              return (
                <tr key={r.memberId}>
                  <td className="px-4 py-2.5 text-neutral-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{r.chapter}</td>
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/admin/accounts/unpaid/${r.memberId}`} className="text-emerald-800 underline-offset-2 hover:underline">
                      {r.member}
                    </Link>
                    {r.awaitingApproval ? <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Awaiting approval</span> : null}
                    {overdue && r.unpaidTerms > 1 ? <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{r.unpaidTerms} years unpaid</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">{r.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{r.category}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-600">{r.term}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-neutral-600">{fmtDate(r.dueDate)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{durationLabel(r.days)}</span>
                  </td>
                  <td className="max-w-xs px-4 py-2.5 text-xs text-neutral-600">
                    {l ? (
                      <Link href={`/admin/accounts/unpaid/${r.memberId}`} className="hover:text-emerald-800">
                        <span className="text-neutral-400">{l.at.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</span> {l.note}
                        {l.count > 1 ? <span className="text-neutral-400"> (+{l.count - 1} earlier)</span> : null}
                      </Link>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function durationLabel(days: number): string {
  if (days === 0) return "Today";
  if (days < 31) return `${days} day${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30.44);
  return `${months} month${months > 1 ? "s" : ""} (${days} days)`;
}
