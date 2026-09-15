import type { ReactNode } from "react";
import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";
import { getLeaderboard } from "@/lib/points/score";
import { jumpToMember } from "./actions";

/**
 * Chapter-wide admin visibility into the BWF App's member-recorded activity
 * (Referrals, Thank You Slips, One-to-Ones, Power Dates, Conclaves) plus a
 * points leaderboard — deliberately deferred until now (see the member
 * portal's Referral/ThankYouSlip pages), since it only makes sense once
 * there's Reports-shaped data worth an admin looking at chapter-wide.
 *
 * Read-only by design: this is a private record between two members, not
 * admin-moderated content like a Blog/Testimonial submission, so there's no
 * edit/approve/reject action here — same rationale already recorded on the
 * member-portal Referral/ThankYouSlip pages.
 *
 * Chapter-scoped the same way as /admin/leads and /admin/exports: a Chapter
 * Admin sees only rows touching one of their own chapter's members (on
 * either side of the interaction); Central/Super Admin see everything, with
 * an extra Chapter column since rows can span chapters.
 */

const TABS = [
  { key: "leaderboard", label: "Points Leaderboard" },
  { key: "referrals", label: "Referrals" },
  { key: "thank-you-slips", label: "Thank You Slips" },
  { key: "one-to-ones", label: "One-to-Ones" },
  { key: "power-dates", label: "Power Dates" },
  { key: "conclaves", label: "Conclaves" },
  { key: "consumers", label: "Consumers" },
  { key: "chief-guests", label: "Chief Guests" },
  { key: "inductions", label: "Inductions" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Column = { header: string };
type Row = { key: string; cells: ReactNode[] };

async function loadTab(tab: TabKey, scope: "ALL" | string): Promise<{ columns: Column[]; rows: Row[] }> {
  const showChapter = scope === "ALL";
  const memberChapterFilter = scope === "ALL" ? {} : { chapterId: scope };

  switch (tab) {
    case "leaderboard": {
      const members = await db.member.findMany({
        where: memberChapterFilter,
        select: { id: true, name: true, chapter: { select: { name: true } } },
      });
      const memberById = new Map(members.map((m) => [m.id, m]));
      const leaderboard = await getLeaderboard(members.map((m) => m.id));

      return {
        columns: [
          { header: "Rank" },
          { header: "Member" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "Total Points" },
        ],
        rows: leaderboard.map((row, i) => {
          const member = memberById.get(row.memberId)!;
          return {
            key: row.memberId,
            cells: [
              i + 1,
              <Link key={row.memberId} href={`/admin/app-activity/${row.memberId}`} className="text-neutral-900 underline hover:text-neutral-600">
                {member.name}
              </Link>,
              ...(showChapter ? [member.chapter.name] : []),
              row.total,
            ],
          };
        }),
      };
    }
    case "referrals": {
      const referrals = await db.referral.findMany({
        where: scope === "ALL" ? {} : { OR: [{ fromMember: memberChapterFilter }, { toMember: memberChapterFilter }] },
        include: { fromMember: { include: { chapter: true } }, toMember: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [
          { header: "From" },
          { header: "To" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "Type" },
          { header: "Description" },
          { header: "Date" },
        ],
        rows: referrals.map((r) => ({
          key: r.id,
          cells: [
            r.fromMember.name,
            r.toMember.name,
            ...(showChapter ? [r.fromMember.chapter.name] : []),
            r.type === "OUTSIDE" ? "Outside Referral" : "Self / Inside Referral",
            r.description ?? "—",
            r.createdAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "thank-you-slips": {
      const slips = await db.thankYouSlip.findMany({
        where: scope === "ALL" ? {} : { OR: [{ fromMember: memberChapterFilter }, { toMember: memberChapterFilter }] },
        include: { fromMember: { include: { chapter: true } }, toMember: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [
          { header: "From" },
          { header: "To" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "Amount" },
          { header: "Description" },
          { header: "Date" },
        ],
        rows: slips.map((s) => ({
          key: s.id,
          cells: [
            s.fromMember.name,
            s.toMember.name,
            ...(showChapter ? [s.fromMember.chapter.name] : []),
            formatInr(String(s.amountInr)),
            s.description ?? "—",
            s.createdAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "one-to-ones": {
      const items = await db.oneToOne.findMany({
        where:
          scope === "ALL" ? {} : { OR: [{ member: memberChapterFilter }, { withMember: memberChapterFilter }] },
        include: { member: { include: { chapter: true } }, withMember: true },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [
          { header: "Member" },
          { header: "With" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "Notes" },
          { header: "Date" },
        ],
        rows: items.map((o) => ({
          key: o.id,
          cells: [
            o.member.name,
            o.withMember.name,
            ...(showChapter ? [o.member.chapter.name] : []),
            o.notes ?? "—",
            o.metAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "power-dates": {
      const items = await db.powerDate.findMany({
        where:
          scope === "ALL"
            ? {}
            : { OR: [{ hostMember: memberChapterFilter }, { participantMember: memberChapterFilter }] },
        include: { hostMember: { include: { chapter: true } }, participantMember: true },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [
          { header: "Host" },
          { header: "Fellow Member" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "External Contact" },
          { header: "Company" },
          { header: "Date" },
        ],
        rows: items.map((p) => ({
          key: p.id,
          cells: [
            p.hostMember.name,
            p.participantMember.name,
            ...(showChapter ? [p.hostMember.chapter.name] : []),
            p.externalContactName,
            p.externalContactCompany ?? "—",
            p.metAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "conclaves": {
      const items = await db.conclave.findMany({
        where:
          scope === "ALL"
            ? {}
            : {
                OR: [
                  { organizedByMember: memberChapterFilter },
                  { participants: { some: { member: memberChapterFilter } } },
                ],
              },
        include: { organizedByMember: { include: { chapter: true } }, participants: { include: { member: true } } },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [
          { header: "Organizer" },
          { header: "Participants" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "Location" },
          { header: "Date" },
        ],
        rows: items.map((c) => ({
          key: c.id,
          cells: [
            c.organizedByMember.name,
            c.participants.map((p) => p.member.name).join(", "),
            ...(showChapter ? [c.organizedByMember.chapter.name] : []),
            c.location ?? "—",
            c.metAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "consumers": {
      const items = await db.consumer.findMany({
        where: scope === "ALL" ? {} : { member: memberChapterFilter },
        include: { member: { include: { chapter: true } } },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [
          { header: "Brought by" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "Consumer" },
          { header: "Company" },
          { header: "Date" },
        ],
        rows: items.map((c) => ({
          key: c.id,
          cells: [
            c.member.name,
            ...(showChapter ? [c.member.chapter.name] : []),
            c.name,
            c.company ?? "—",
            c.metAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "chief-guests": {
      const items = await db.memberChiefGuest.findMany({
        where: scope === "ALL" ? {} : { member: memberChapterFilter },
        include: { member: { include: { chapter: true } } },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [
          { header: "Invited by" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "Chief Guest" },
          { header: "Company" },
          { header: "Date" },
        ],
        rows: items.map((g) => ({
          key: g.id,
          cells: [
            g.member.name,
            ...(showChapter ? [g.member.chapter.name] : []),
            g.name,
            g.company ?? "—",
            g.metAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "inductions": {
      const items = await db.member.findMany({
        where: {
          referredByMemberId: { not: null },
          ...(scope === "ALL" ? {} : { referredBy: memberChapterFilter }),
        },
        include: { referredBy: { include: { chapter: true } }, chapter: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [
          { header: "Inducted by" },
          ...(showChapter ? [{ header: "Chapter" }] : []),
          { header: "New Member" },
          { header: "Joined" },
        ],
        rows: items.map((m) => ({
          key: m.id,
          cells: [
            m.referredBy!.name,
            ...(showChapter ? [m.referredBy!.chapter.name] : []),
            m.name,
            m.createdAt.toLocaleDateString(),
          ],
        })),
      };
    }
  }
}

export default async function AppActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const scope = await getChapterScope("app_activity:view");
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "leaderboard";

  const [{ columns, rows }, jumpMembers] = await Promise.all([
    loadTab(tab, scope),
    db.member.findMany({
      where: scope === "ALL" ? {} : { chapterId: scope },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">BWF App Activity</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Chapter-wide visibility into what members are logging in the BWF App — read-only, since
          these are private records between members, not content that needs admin approval.
        </p>
      </div>

      <form action={jumpToMember} className="flex items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Jump to member
          <select
            name="memberId"
            defaultValue=""
            required
            className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <option value="" disabled>
              Select a member…
            </option>
            {jumpMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Go
        </button>
      </form>

      <nav className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/app-activity?tab=${t.key}`}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              tab === t.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className="px-4 py-3 font-medium">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, i) => (
                  <td key={i} className="px-4 py-3 text-neutral-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-neutral-400">
                  Nothing here yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
