import { db } from "@/lib/db";
import type { ActivityType } from "@/generated/prisma/client";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  REFERRAL: "Referrals",
  THANK_YOU_SLIP: "Thank You Slips",
  ONE_TO_ONE: "One-to-Ones",
  POWER_DATE: "Power Dates",
  CONCLAVE: "Conclaves",
  VISITOR: "Visitors Brought",
  CONSUMER: "Consumers Brought",
  CHIEF_GUEST: "Chief Guests Brought",
  INDUCTION: "Inductions",
};

const ACTIVITY_TYPES = Object.keys(ACTIVITY_LABELS) as ActivityType[];

/**
 * Real counts per activity type for one member, as of right now (not a
 * stored/cached total — recomputed on read, same as every other dashboard
 * metric in this project). VISITOR still derives from the public Visitor
 * model (a prospective-member visitor genuinely is that); CONSUMER/
 * CHIEF_GUEST/INDUCTION derive from Consumer/MemberChiefGuest (self-reported,
 * Phase 20 Batch 5) and Member.referredByMemberId (decision #6's manual
 * picker) — see the PointsConfig schema comment for the full history.
 */
export async function getMemberActivityCounts(memberId: string): Promise<Record<ActivityType, number>> {
  const [
    referrals,
    thankYouSlips,
    oneToOnes,
    powerDates,
    conclaves,
    visitors,
    consumers,
    chiefGuests,
    inductions,
  ] = await Promise.all([
    db.referral.count({ where: { fromMemberId: memberId } }),
    db.thankYouSlip.count({ where: { fromMemberId: memberId } }),
    db.oneToOne.count({ where: { OR: [{ memberId }, { withMemberId: memberId }] } }),
    db.powerDate.count({ where: { hostMemberId: memberId } }),
    db.conclave.count({
      where: { OR: [{ organizedByMemberId: memberId }, { participants: { some: { memberId } } }] },
    }),
    db.visitor.count({
      where: { referringMemberId: memberId, OR: [{ purposeOfVisit: null }, { purposeOfVisit: "PROSPECTIVE_MEMBER" }] },
    }),
    db.consumer.count({ where: { memberId } }),
    db.memberChiefGuest.count({ where: { memberId } }),
    db.member.count({ where: { referredByMemberId: memberId } }),
  ]);

  return {
    REFERRAL: referrals,
    THANK_YOU_SLIP: thankYouSlips,
    ONE_TO_ONE: oneToOnes,
    POWER_DATE: powerDates,
    CONCLAVE: conclaves,
    VISITOR: visitors,
    CONSUMER: consumers,
    CHIEF_GUEST: chiefGuests,
    INDUCTION: inductions,
  };
}

export async function getPointsConfig(): Promise<Record<ActivityType, number>> {
  const rows = await db.pointsConfig.findMany();
  const map = new Map(rows.map((r) => [r.activityType, r.points]));
  return Object.fromEntries(ACTIVITY_TYPES.map((type) => [type, map.get(type) ?? 0])) as Record<ActivityType, number>;
}

export type ScoreBreakdownRow = {
  type: ActivityType;
  label: string;
  count: number;
  pointsEach: number;
  subtotal: number;
};

export async function computeMemberScore(memberId: string): Promise<{ total: number; breakdown: ScoreBreakdownRow[] }> {
  const [counts, config] = await Promise.all([getMemberActivityCounts(memberId), getPointsConfig()]);

  const breakdown: ScoreBreakdownRow[] = ACTIVITY_TYPES.map((type) => {
    const count = counts[type];
    const pointsEach = config[type];
    return { type, label: ACTIVITY_LABELS[type], count, pointsEach, subtotal: count * pointsEach };
  });

  return { total: breakdown.reduce((sum, row) => sum + row.subtotal, 0), breakdown };
}

export type LeaderboardRow = {
  memberId: string;
  total: number;
  breakdown: ScoreBreakdownRow[];
};

/**
 * Same per-member counts as getMemberActivityCounts(), but for a whole set
 * of members at once via a fixed ~9 `groupBy` queries total — NOT
 * `memberIds.map(getMemberActivityCounts)`, which would fire this file's own
 * Promise.all of 9 queries once per member. At real member counts (100+)
 * that reproduces the exact connection-pool exhaustion this project already
 * hit once (docs/PHASES.md Phase 8's P2028 note, this app's 5-connection
 * cap). Used by the admin leaderboard (`/admin/app-activity`), which may
 * need every member in scope at once, unlike the member portal's
 * computeMemberScore() (always exactly one member).
 */
async function getActivityCountsForMembers(memberIds: string[]): Promise<Map<string, Record<ActivityType, number>>> {
  const counts = new Map<string, Record<ActivityType, number>>(
    memberIds.map((id) => [
      id,
      { REFERRAL: 0, THANK_YOU_SLIP: 0, ONE_TO_ONE: 0, POWER_DATE: 0, CONCLAVE: 0, VISITOR: 0, CONSUMER: 0, CHIEF_GUEST: 0, INDUCTION: 0 },
    ]),
  );
  if (memberIds.length === 0) return counts;

  const add = (type: ActivityType, id: string, n: number) => {
    const row = counts.get(id);
    if (row) row[type] += n;
  };

  const inScope = { in: memberIds };
  const [
    referrals,
    thankYouSlips,
    oneToOnesAsMember,
    oneToOnesAsWith,
    powerDates,
    conclavesOrganized,
    conclaveParticipations,
    visitors,
    consumers,
    chiefGuests,
    inductions,
  ] = await Promise.all([
    db.referral.groupBy({ by: ["fromMemberId"], where: { fromMemberId: inScope }, _count: { _all: true } }),
    db.thankYouSlip.groupBy({ by: ["fromMemberId"], where: { fromMemberId: inScope }, _count: { _all: true } }),
    db.oneToOne.groupBy({ by: ["memberId"], where: { memberId: inScope }, _count: { _all: true } }),
    db.oneToOne.groupBy({ by: ["withMemberId"], where: { withMemberId: inScope }, _count: { _all: true } }),
    db.powerDate.groupBy({ by: ["hostMemberId"], where: { hostMemberId: inScope }, _count: { _all: true } }),
    db.conclave.groupBy({ by: ["organizedByMemberId"], where: { organizedByMemberId: inScope }, _count: { _all: true } }),
    db.conclaveParticipant.groupBy({ by: ["memberId"], where: { memberId: inScope }, _count: { _all: true } }),
    db.visitor.groupBy({
      by: ["referringMemberId"],
      where: { referringMemberId: inScope, OR: [{ purposeOfVisit: null }, { purposeOfVisit: "PROSPECTIVE_MEMBER" }] },
      _count: { _all: true },
    }),
    db.consumer.groupBy({ by: ["memberId"], where: { memberId: inScope }, _count: { _all: true } }),
    db.memberChiefGuest.groupBy({ by: ["memberId"], where: { memberId: inScope }, _count: { _all: true } }),
    db.member.groupBy({ by: ["referredByMemberId"], where: { referredByMemberId: inScope }, _count: { _all: true } }),
  ]);

  referrals.forEach((r) => add("REFERRAL", r.fromMemberId, r._count._all));
  thankYouSlips.forEach((r) => add("THANK_YOU_SLIP", r.fromMemberId, r._count._all));
  oneToOnesAsMember.forEach((r) => add("ONE_TO_ONE", r.memberId, r._count._all));
  oneToOnesAsWith.forEach((r) => add("ONE_TO_ONE", r.withMemberId, r._count._all));
  powerDates.forEach((r) => add("POWER_DATE", r.hostMemberId, r._count._all));
  conclavesOrganized.forEach((r) => add("CONCLAVE", r.organizedByMemberId, r._count._all));
  conclaveParticipations.forEach((r) => add("CONCLAVE", r.memberId, r._count._all));
  visitors.forEach((r) => r.referringMemberId && add("VISITOR", r.referringMemberId, r._count._all));
  consumers.forEach((r) => add("CONSUMER", r.memberId, r._count._all));
  chiefGuests.forEach((r) => add("CHIEF_GUEST", r.memberId, r._count._all));
  inductions.forEach((r) => r.referredByMemberId && add("INDUCTION", r.referredByMemberId, r._count._all));

  return counts;
}

/** Every member's total score + breakdown for the given set of member ids, ranked highest-first. */
export async function getLeaderboard(memberIds: string[]): Promise<LeaderboardRow[]> {
  const [countsByMember, config] = await Promise.all([getActivityCountsForMembers(memberIds), getPointsConfig()]);

  const rows: LeaderboardRow[] = memberIds.map((memberId) => {
    const counts = countsByMember.get(memberId)!;
    const breakdown: ScoreBreakdownRow[] = ACTIVITY_TYPES.map((type) => {
      const count = counts[type];
      const pointsEach = config[type];
      return { type, label: ACTIVITY_LABELS[type], count, pointsEach, subtotal: count * pointsEach };
    });
    return { memberId, total: breakdown.reduce((sum, row) => sum + row.subtotal, 0), breakdown };
  });

  return rows.sort((a, b) => b.total - a.total);
}
