import Link from "next/link";
import { db } from "@/lib/db";
import { membershipEditScope } from "@/lib/members/membership-access";
import { getNumberSetting } from "@/lib/settings";
import { istDateKey } from "@/lib/payments/dates";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { MembershipBulkTable } from "@/components/admin/membership-bulk-table";
import { MembershipDueDaysForm } from "@/components/admin/membership-due-days-form";

const LIMIT = 300;
const field = "rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900";

/**
 * 2026-11-18 — one place to set every member's joining date and tick the
 * annual-membership years paid before this website was used, plus the
 * "fee is due N days before the year starts" setting.
 */
export default async function MembershipBulkPage({ searchParams }: { searchParams: Promise<{ chapterId?: string; q?: string }> }) {
  const scope = await membershipEditScope();
  const params = await searchParams;
  const chapterId = scope === "ALL" ? params.chapterId || undefined : scope;
  const q = params.q?.trim();

  const [chapters, dueDays, members] = await Promise.all([
    scope === "ALL" ? db.chapter.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    getNumberSetting("membership.dueDaysBefore"),
    db.member.findMany({
      where: { status: "ACTIVE", rosterEligible: true, ...(chapterId ? { chapterId } : {}), ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
      orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
      take: LIMIT + 1,
      select: {
        id: true,
        name: true,
        joinedAt: true,
        membershipPaidTerms: true,
        chapter: { select: { name: true } },
        payments: { where: { type: "MEMBERSHIP", status: "APPROVED", membershipYear: { not: null } }, select: { membershipYear: true } },
      },
    }),
  ]);
  const shown = members.slice(0, LIMIT);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />
          Joining dates &amp; paid years
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Annual membership runs from each member&rsquo;s joining date. Set the date here for many members at once, and tick the years already paid
          before this website was used. To change one member, open them from <Link href="/admin/members" className="underline hover:text-emerald-800">Members</Link>.
        </p>
      </div>

      {scope === "ALL" ? <MembershipDueDaysForm days={dueDays} /> : null}

      <form method="GET" className="flex flex-wrap items-end gap-3">
        {scope === "ALL" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Chapter
            <select name="chapterId" defaultValue={chapterId ?? ""} className={field}>
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
          Member name
          <input type="search" name="q" defaultValue={q} className={field} />
        </label>
        <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          Show
        </button>
        <Link href="/admin/members/membership" className="pb-2 text-sm text-neutral-500 underline hover:text-emerald-800">
          Reset
        </Link>
      </form>
      {members.length > LIMIT ? <p className="text-xs text-neutral-500">Showing the first {LIMIT} — pick a chapter or search by name to see the rest.</p> : null}

      <MembershipBulkTable
        todayKey={istDateKey(new Date())}
        dueDays={dueDays}
        rows={shown.map((m) => ({
          id: m.id,
          name: m.name,
          chapter: m.chapter.name,
          joinedKey: istDateKey(m.joinedAt),
          paid: m.membershipPaidTerms,
          onSite: [...new Set(m.payments.map((p) => p.membershipYear as number))],
        }))}
      />
    </div>
  );
}
