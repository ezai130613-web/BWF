import { db } from "@/lib/db";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { getOpenCategories } from "@/lib/chapters/availability";
import { getLeaderboard } from "@/lib/points/score";

/**
 * Roster Sheet interactive management (2026-09-16 correction) — data loading
 * for the `/admin/roster/[meetingId]` wizard. One loader,
 * `getRosterWizardData()`, computed once server-side and handed to a client
 * wizard as plain data — same precedent as the Phase 7 `/apply` wizard
 * ("the multi-step UI runs entirely client-side off that one payload, no
 * extra round-trips as the applicant moves through steps").
 *
 * Saving lives in the sibling actions.ts ("use server"), not here — this
 * file is a plain server-side module imported by the wizard's page.tsx.
 */

// Same "Founder/Co-Founder are fixed founding roles" convention as
// src/app/admin/(dashboard)/chapters/[id]/page.tsx and
// src/lib/roster/generate.ts's cover-page band.
const FOUNDING_ROLE_ORDER = ["FOUNDER", "CO_FOUNDER"] as const;

export type RosterWizardLeadershipEntry = {
  memberId: string;
  memberName: string;
  photoUrl: string | null;
  roleLabel: string;
};

export type RosterWizardAssignmentEntry = {
  memberId: string;
  memberName: string;
  photoUrl: string | null;
  roleLabel: string;
  group: "PRESIDENT" | "SECRETARY" | "TREASURER";
};

export type RosterWizardChiefGuest = {
  id: string;
  name: string;
  company: string | null;
  designation: string | null;
  photoUrl: string | null;
};

export type RosterWizardCategory = { id: string; name: string };

export type RosterWizardMember = {
  id: string;
  name: string;
  designation: string | null;
  company: string;
  email: string | null;
  phone: string | null;
  categoryName: string;
  photoUrl: string | null;
  score: number;
  /** Live overall activity points (src/lib/points/score.ts) — the system value the score defaults to. */
  systemPoints: number;
};

export type RosterWizardData = {
  meetingId: string;
  meetingTitle: string;
  meetingStartsAt: string;
  chapterId: string;
  chapterName: string;

  chiefGuestCandidates: RosterWizardChiefGuest[];
  selectedChiefGuestIds: string[];

  foundingTeam: RosterWizardLeadershipEntry[];
  leadershipTeam: RosterWizardLeadershipEntry[];
  coordinators: RosterWizardAssignmentEntry[];

  allOtherMembers: RosterWizardMember[];

  openCategoryCandidates: RosterWizardCategory[];
  selectedOpenCategoryIds: string[];

  notesEnabled: boolean;
  isSaved: boolean;
  orderMode: "AUTO" | "MANUAL";
};

/**
 * The chapter's Coordinator member ids — excluded from "All Other Members"
 * since Coordinators keep their own dedicated section with no separate
 * score. Shared between the wizard loader below and the save action
 * (src/app/admin/(dashboard)/roster/[meetingId]/actions.ts), which
 * re-derives this server-side rather than trusting whatever member ids the
 * client submits.
 *
 * Founding Team and Leadership Team members are deliberately NOT excluded
 * here (2026-09-16 client correction, reversing the original planning
 * decision): they're shown in their own section at the top of the roster
 * *and* appear again, scored, in "All Other Members" — the client's own
 * reasoning is that they're also members with their own specific Give/Ask,
 * so their name and score belong in the general list too, duplication and
 * all.
 */
export async function getExcludedMemberIds(chapterId: string): Promise<Set<string>> {
  const assignments = await db.rosterAssignment.findMany({ where: { chapterId }, select: { memberId: true } });
  return new Set(assignments.map((a) => a.memberId));
}

/** Returns null if the meeting doesn't exist. Throws (via requireChapterAccess) if the caller can't manage this meeting's chapter's roster. */
export async function getRosterWizardData(meetingId: string): Promise<RosterWizardData | null> {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId }, include: { chapter: true } });
  if (!meeting) return null;

  await requireChapterAccess(meeting.chapterId, "roster:manage");

  const [existingRoster, chiefGuestCandidates, leadership, assignments, openCategoryCandidates] = await Promise.all([
    db.roster.findUnique({
      where: { meetingId },
      include: { chiefGuests: true, openCategories: true, scores: true },
    }),
    db.chiefGuest.findMany({
      where: { chapterId: meeting.chapterId },
      orderBy: [{ displayOrder: "asc" }, { visitedAt: "desc" }],
    }),
    db.chapterLeadership.findMany({
      where: { chapterId: meeting.chapterId },
      include: { member: true, role: true },
      orderBy: { startedAt: "asc" },
    }),
    db.rosterAssignment.findMany({
      where: { chapterId: meeting.chapterId },
      include: { member: true, role: true },
      orderBy: [{ group: "asc" }, { role: { order: "asc" } }, { createdAt: "asc" }],
    }),
    getOpenCategories(meeting.chapterId),
  ]);

  const foundingTeam = FOUNDING_ROLE_ORDER.map((key) => leadership.find((l) => l.role.key === key))
    .filter((l): l is (typeof leadership)[number] => Boolean(l))
    .map((l) => ({ memberId: l.memberId, memberName: l.member.name, photoUrl: l.member.photoUrl, roleLabel: l.role.label }));

  const leadershipTeam = leadership
    .filter((l) => !(FOUNDING_ROLE_ORDER as readonly string[]).includes(l.role.key))
    .map((l) => ({ memberId: l.memberId, memberName: l.member.name, photoUrl: l.member.photoUrl, roleLabel: l.role.label }));

  const coordinators = assignments.map((a) => ({
    memberId: a.memberId,
    memberName: a.member.name,
    photoUrl: a.member.photoUrl,
    roleLabel: a.role.label,
    group: a.group,
  }));

  const excludedMemberIds = await getExcludedMemberIds(meeting.chapterId);

  const members = await db.member.findMany({
    where: {
      chapterId: meeting.chapterId,
      status: "ACTIVE",
      rosterEligible: true,
      id: { notIn: [...excludedMemberIds] },
    },
    include: { company: true, category: true },
    orderBy: { joinedAt: "asc" },
  });

  // Scores come from each member's live overall activity points
  // (2026-10-03 correction — replaces the earlier carry-forward from the
  // previous meeting's roster). One batched leaderboard query for the whole
  // chapter, not one per member.
  const leaderboard = await getLeaderboard(members.map((m) => m.id));
  const pointsByMember = new Map(leaderboard.map((row) => [row.memberId, row.total]));

  const existingScoreByMember = new Map((existingRoster?.scores ?? []).map((s) => [s.memberId, s]));
  const maxExistingOrder = existingRoster?.scores.length ? Math.max(...existingRoster.scores.map((s) => s.order)) : -1;

  // A brand-new roster starts auto-ranked by points (stable, so ties keep
  // joinedAt order). Reopening a saved roster keeps its saved positions
  // and scores — including any manual edits — appending members who are
  // new since that save.
  const autoRank = new Map(
    [...members]
      .map((m, idx) => ({ id: m.id, idx, points: pointsByMember.get(m.id) ?? 0 }))
      .sort((a, b) => b.points - a.points || a.idx - b.idx)
      .map((m, rank) => [m.id, rank]),
  );

  const membersWithOrder = members.map((m, idx) => {
    const existing = existingScoreByMember.get(m.id);
    const systemPoints = pointsByMember.get(m.id) ?? 0;
    const score = existing?.score ?? systemPoints;
    const order = existing ? existing.order : existingRoster ? maxExistingOrder + 1 + idx : autoRank.get(m.id)!;
    return { id: m.id, name: m.name, designation: m.designation, company: m.company.name, email: m.email, phone: m.phone, categoryName: m.category.name, photoUrl: m.photoUrl, score, systemPoints, order };
  });
  membersWithOrder.sort((a, b) => a.order - b.order);
  const allOtherMembers: RosterWizardMember[] = membersWithOrder.map((m) => ({
    id: m.id,
    name: m.name,
    designation: m.designation,
    company: m.company,
    email: m.email,
    phone: m.phone,
    categoryName: m.categoryName,
    photoUrl: m.photoUrl,
    score: m.score,
    systemPoints: m.systemPoints,
  }));

  const selectedChiefGuestIds = existingRoster
    ? existingRoster.chiefGuests.map((g) => g.id)
    : meeting.chiefGuestId
      ? [meeting.chiefGuestId]
      : [];

  const selectedOpenCategoryIds = existingRoster
    ? existingRoster.openCategories.map((c) => c.id)
    : openCategoryCandidates.map((c) => c.id);

  return {
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    meetingStartsAt: meeting.startsAt.toISOString(),
    chapterId: meeting.chapterId,
    chapterName: meeting.chapter.name,

    chiefGuestCandidates: chiefGuestCandidates.map((g) => ({
      id: g.id,
      name: g.name,
      company: g.company,
      designation: g.designation,
      photoUrl: g.photoUrl,
    })),
    selectedChiefGuestIds,

    foundingTeam,
    leadershipTeam,
    coordinators,

    allOtherMembers,

    openCategoryCandidates,
    selectedOpenCategoryIds,

    notesEnabled: existingRoster?.notesEnabled ?? false,
    isSaved: Boolean(existingRoster?.savedAt),
    orderMode: existingRoster?.orderMode ?? "AUTO",
  };
}
