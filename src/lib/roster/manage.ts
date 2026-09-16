import { db } from "@/lib/db";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { getOpenCategories } from "@/lib/chapters/availability";

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
};

/**
 * The chapter's Founding Team + Leadership Team + Coordinator member ids —
 * excluded from "All Other Members" per the client's own confirmation
 * (2026-09-16 planning): a member shows up in exactly one section, never
 * twice. Shared between the wizard loader below and the save action
 * (src/app/admin/(dashboard)/roster/[meetingId]/actions.ts), which
 * re-derives this server-side rather than trusting whatever member ids the
 * client submits.
 */
export async function getExcludedMemberIds(chapterId: string): Promise<Set<string>> {
  const [leadership, assignments] = await Promise.all([
    db.chapterLeadership.findMany({ where: { chapterId }, select: { memberId: true } }),
    db.rosterAssignment.findMany({ where: { chapterId }, select: { memberId: true } }),
  ]);
  return new Set([...leadership.map((l) => l.memberId), ...assignments.map((a) => a.memberId)]);
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

  // Score carry-forward (client decision, 2026-09-16): a member's score on a
  // brand-new roster starts from their most recent OTHER scored meeting in
  // this same chapter, not a hard reset to 0. Fetched and reduced to
  // "first (most recent) hit per member" in JS — same "fine at this scale"
  // precedent as findMatchingCompany (company fuzzy-match, Phase 7) — a
  // two-hop relation sort (RosterScore -> Roster -> Meeting.startsAt) isn't
  // something a single Prisma orderBy can express cleanly, so this sorts in
  // JS instead of forcing an awkward query.
  const priorScoreRows = members.length
    ? await db.rosterScore.findMany({
        where: {
          memberId: { in: members.map((m) => m.id) },
          roster: { meetingId: { not: meetingId }, meeting: { chapterId: meeting.chapterId } },
        },
        include: { roster: { include: { meeting: true } } },
      })
    : [];
  priorScoreRows.sort((a, b) => b.roster.meeting.startsAt.getTime() - a.roster.meeting.startsAt.getTime());
  const priorScoreByMember = new Map<string, { score: number; order: number }>();
  for (const row of priorScoreRows) {
    if (!priorScoreByMember.has(row.memberId)) priorScoreByMember.set(row.memberId, { score: row.score, order: row.order });
  }

  const existingScoreByMember = new Map((existingRoster?.scores ?? []).map((s) => [s.memberId, s]));
  const maxExistingOrder = existingRoster?.scores.length ? Math.max(...existingRoster.scores.map((s) => s.order)) : -1;

  const membersWithOrder = members.map((m, idx) => {
    const existing = existingScoreByMember.get(m.id);
    const prior = priorScoreByMember.get(m.id);
    const score = existing?.score ?? prior?.score ?? 0;
    // Reopening an already-saved roster: keep this member's saved position,
    // or append after everyone else if they're new since that save. Never
    // saved yet: fall back to joinedAt order (today's PDF default) —
    // "previous relative order" isn't meaningful before a first save has
    // ever happened.
    const order = existing ? existing.order : existingRoster ? maxExistingOrder + 1 + idx : idx;
    return { id: m.id, name: m.name, designation: m.designation, company: m.company.name, email: m.email, phone: m.phone, categoryName: m.category.name, photoUrl: m.photoUrl, score, order };
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
  };
}
