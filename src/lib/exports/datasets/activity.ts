import { db } from "@/lib/db";
import { getLeaderboard } from "@/lib/points/score";
import { chapterScope } from "../access";
import type { ExportDataset } from "./types";
import type { Prisma } from "@/generated/prisma/client";

/**
 * /admin/app-activity — every tab as its own sheet. Scoped like the page: a
 * Chapter Admin gets rows touching one of their chapter's members on either
 * side. `memberId` narrows to one member (the drill-down page); it's
 * checked against the scope, never trusted.
 */
const appActivity: ExportDataset = {
  key: "app-activity",
  title: "App Activity",
  scope: (a) => chapterScope(a, "app_activity:view"),
  async load(scope, params) {
    const chapterMember: Prisma.MemberWhereInput = scope === "ALL" ? {} : { chapterId: scope };
    const requestedMemberId = params.get("memberId") || undefined;
    const memberId = requestedMemberId
      ? ((await db.member.findFirst({ where: { id: requestedMemberId, ...chapterMember }, select: { id: true } }))?.id ?? "__none__")
      : undefined;

    // Rows involving the chosen member, or (no member) touching the scope.
    const pair = (a: string, b: string) =>
      memberId
        ? { OR: [{ [a]: memberId }, { [b]: memberId }] }
        : scope === "ALL"
          ? {}
          : { OR: [{ [a.replace(/Id$/, "")]: chapterMember }, { [b.replace(/Id$/, "")]: chapterMember }] };
    const single = (field: string) => (memberId ? { [field]: memberId } : scope === "ALL" ? {} : { [field.replace(/Id$/, "")]: chapterMember });

    const [members, referrals, slips, oneToOnes, powerDates, conclaves, consumers, chiefGuests, inductions] = await Promise.all([
      db.member.findMany({
        where: memberId ? { id: memberId } : chapterMember,
        select: { id: true, name: true, status: true, chapter: { select: { name: true } } },
      }),
      db.referral.findMany({
        where: pair("fromMemberId", "toMemberId"),
        include: { fromMember: { include: { chapter: true } }, toMember: true },
        orderBy: { createdAt: "desc" },
      }),
      db.thankYouSlip.findMany({
        where: pair("fromMemberId", "toMemberId"),
        include: { fromMember: { include: { chapter: true } }, toMember: true },
        orderBy: { createdAt: "desc" },
      }),
      db.oneToOne.findMany({
        where: pair("memberId", "withMemberId"),
        include: { member: { include: { chapter: true } }, withMember: true },
        orderBy: { metAt: "desc" },
      }),
      db.powerDate.findMany({
        where: pair("hostMemberId", "participantMemberId"),
        include: { hostMember: { include: { chapter: true } }, participantMember: true },
        orderBy: { metAt: "desc" },
      }),
      db.conclave.findMany({
        where: memberId
          ? { OR: [{ organizedByMemberId: memberId }, { participants: { some: { memberId } } }] }
          : scope === "ALL"
            ? {}
            : { OR: [{ organizedByMember: chapterMember }, { participants: { some: { member: chapterMember } } }] },
        include: { organizedByMember: { include: { chapter: true } }, participants: { include: { member: true } } },
        orderBy: { metAt: "desc" },
      }),
      db.consumer.findMany({ where: single("memberId"), include: { member: { include: { chapter: true } } }, orderBy: { metAt: "desc" } }),
      db.memberChiefGuest.findMany({
        where: single("memberId"),
        include: { member: { include: { chapter: true } } },
        orderBy: { metAt: "desc" },
      }),
      db.member.findMany({
        where: {
          referredByMemberId: memberId ?? { not: null },
          ...(memberId || scope === "ALL" ? {} : { referredBy: chapterMember }),
        },
        include: { referredBy: { include: { chapter: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const leaderboard = await getLeaderboard(members.map((m) => m.id));
    const memberById = new Map(members.map((m) => [m.id, m]));
    const breakdownColumns = leaderboard[0]?.breakdown ?? [];

    return [
      {
        name: "Points Leaderboard",
        columns: [
          { header: "Rank", key: "rank", type: "number" },
          { header: "Member", key: "member", width: 26 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Status", key: "status" },
          { header: "Total Points", key: "total", type: "number" },
          ...breakdownColumns.map((b) => ({ header: b.label, key: b.type, type: "number" as const })),
        ],
        rows: leaderboard.map((row, i) => {
          const m = memberById.get(row.memberId);
          return {
            rank: i + 1,
            member: m?.name,
            chapter: m?.chapter.name,
            status: m?.status,
            total: row.total,
            ...Object.fromEntries(row.breakdown.map((b) => [b.type, b.count])),
          };
        }),
      },
      {
        name: "Referrals",
        columns: [
          { header: "Date", key: "date", type: "date", width: 14 },
          { header: "From", key: "from", width: 24 },
          { header: "To", key: "to", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Type", key: "type", width: 20 },
          { header: "Description", key: "description", width: 40 },
        ],
        rows: referrals.map((r) => ({
          date: r.createdAt,
          from: r.fromMember.name,
          to: r.toMember.name,
          chapter: r.fromMember.chapter.name,
          type: r.type === "OUTSIDE" ? "Outside Referral" : "Self / Inside Referral",
          description: r.description,
        })),
      },
      {
        name: "Thank You Slips",
        columns: [
          { header: "Date", key: "date", type: "date", width: 14 },
          { header: "From", key: "from", width: 24 },
          { header: "To", key: "to", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Amount (INR)", key: "amount", type: "money", width: 14 },
          { header: "Description", key: "description", width: 40 },
        ],
        rows: slips.map((s) => ({
          date: s.createdAt,
          from: s.fromMember.name,
          to: s.toMember.name,
          chapter: s.fromMember.chapter.name,
          amount: s.amountInr,
          description: s.description,
        })),
      },
      {
        name: "One-to-Ones",
        columns: [
          { header: "Date", key: "date", type: "date", width: 14 },
          { header: "Member", key: "member", width: 24 },
          { header: "With", key: "with", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Notes", key: "notes", width: 40 },
        ],
        rows: oneToOnes.map((o) => ({
          date: o.metAt,
          member: o.member.name,
          with: o.withMember.name,
          chapter: o.member.chapter.name,
          notes: o.notes,
        })),
      },
      {
        name: "Power Dates",
        columns: [
          { header: "Date", key: "date", type: "date", width: 14 },
          { header: "Host", key: "host", width: 24 },
          { header: "Fellow Member", key: "participant", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "External Contact", key: "contact", width: 24 },
          { header: "Company", key: "company", width: 24 },
          { header: "Notes", key: "notes", width: 30 },
        ],
        rows: powerDates.map((p) => ({
          date: p.metAt,
          host: p.hostMember.name,
          participant: p.participantMember.name,
          chapter: p.hostMember.chapter.name,
          contact: p.externalContactName,
          company: p.externalContactCompany,
          notes: p.notes,
        })),
      },
      {
        name: "Conclaves",
        columns: [
          { header: "Date", key: "date", type: "date", width: 14 },
          { header: "Organizer", key: "organizer", width: 24 },
          { header: "Participants", key: "participants", width: 40 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Location", key: "location", width: 24 },
          { header: "Notes", key: "notes", width: 30 },
        ],
        rows: conclaves.map((c) => ({
          date: c.metAt,
          organizer: c.organizedByMember.name,
          participants: c.participants.map((p) => p.member.name).join(", "),
          chapter: c.organizedByMember.chapter.name,
          location: c.location,
          notes: c.notes,
        })),
      },
      {
        name: "Consumers",
        columns: [
          { header: "Date", key: "date", type: "date", width: 14 },
          { header: "Brought By", key: "member", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Consumer", key: "name", width: 24 },
          { header: "Company", key: "company", width: 24 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Notes", key: "notes", width: 30 },
        ],
        rows: consumers.map((c) => ({
          date: c.metAt,
          member: c.member.name,
          chapter: c.member.chapter.name,
          name: c.name,
          company: c.company,
          phone: c.phone,
          notes: c.notes,
        })),
      },
      {
        name: "Chief Guests Invited",
        columns: [
          { header: "Date", key: "date", type: "date", width: 14 },
          { header: "Invited By", key: "member", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Chief Guest", key: "name", width: 24 },
          { header: "Designation", key: "designation", width: 20 },
          { header: "Company", key: "company", width: 24 },
          { header: "Notes", key: "notes", width: 30 },
        ],
        rows: chiefGuests.map((g) => ({
          date: g.metAt,
          member: g.member.name,
          chapter: g.member.chapter.name,
          name: g.name,
          designation: g.designation,
          company: g.company,
          notes: g.notes,
        })),
      },
      {
        name: "Inductions",
        columns: [
          { header: "Joined", key: "date", type: "date", width: 14 },
          { header: "Inducted By", key: "by", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "New Member", key: "member", width: 24 },
        ],
        rows: inductions.map((m) => ({
          date: m.joinedAt,
          by: m.referredBy?.name,
          chapter: m.referredBy?.chapter.name,
          member: m.name,
        })),
      },
    ];
  },
};

export const ACTIVITY_DATASETS = [appActivity];
