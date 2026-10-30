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
  ATTENDANCE: "Meetings Attended",
};

/**
 * What one "unit" of each activity is, for the admin's "Every N … = P points"
 * rule. THANK_YOU_SLIP is the only one scored on value (rupees of business);
 * every other type counts occurrences.
 */
export const ACTIVITY_UNITS: Record<ActivityType, { one: string; many: string }> = {
  REFERRAL: { one: "referral", many: "referrals" },
  THANK_YOU_SLIP: { one: "rupee of business value", many: "rupees of business value" },
  ONE_TO_ONE: { one: "one-to-one", many: "one-to-ones" },
  POWER_DATE: { one: "person brought on a Power Date", many: "people brought on Power Dates" },
  CONCLAVE: { one: "conclave", many: "conclaves" },
  VISITOR: { one: "visitor", many: "visitors" },
  CONSUMER: { one: "consumer", many: "consumers" },
  CHIEF_GUEST: { one: "chief guest", many: "chief guests" },
  INDUCTION: { one: "induction", many: "inductions" },
  ATTENDANCE: { one: "meeting attended", many: "meetings attended" },
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** "Every ₹500 = 1 pt", "Every 1 person brought on a Power Date = 50 pts". */
export function describeRule(type: ActivityType, rule: PointsRule): string {
  const pts = `${rule.points} ${rule.points === 1 ? "pt" : "pts"}`;
  if (type === "THANK_YOU_SLIP") return `Every ${inr(rule.perUnit)} = ${pts}`;
  const unit = ACTIVITY_UNITS[type];
  return `Every ${rule.perUnit} ${rule.perUnit === 1 ? unit.one : unit.many} = ${pts}`;
}

const ACTIVITY_TYPES = Object.keys(ACTIVITY_LABELS) as ActivityType[];

export type PointsRule = { points: number; perUnit: number };

/** Whole multiples only — ₹1,400 at "every ₹500 = 1 pt" is 2 points. */
const pointsFor = (quantity: number, rule: PointsRule) => Math.floor(quantity / Math.max(1, rule.perUnit)) * rule.points;

/**
 * Real counts per activity type for one member, as of right now (not a
 * stored/cached total — recomputed on read, same as every other dashboard
 * metric in this project). VISITOR still derives from the public Visitor
 * model (a prospective-member visitor genuinely is that); CONSUMER/
 * CHIEF_GUEST/INDUCTION derive from Consumer/MemberChiefGuest (self-reported,
 * Phase 20 Batch 5) and Member.referredByMemberId (decision #6's manual
 * picker) — see the PointsConfig schema comment for the full history.
 * ATTENDANCE counts meetings marked PRESENT. Thank You Slips also carry
 * their rupee total, which is what they're scored on.
 */
export async function getMemberActivityCounts(memberId: string): Promise<MemberActivity> {
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
    attendances,
  ] = await Promise.all([
    db.referral.count({ where: { fromMemberId: memberId } }),
    db.thankYouSlip.aggregate({ where: { fromMemberId: memberId }, _count: { _all: true }, _sum: { amountInr: true } }),
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
    db.attendance.count({ where: { memberId, status: "PRESENT" } }),
  ]);

  return {
    counts: {
      REFERRAL: referrals,
      THANK_YOU_SLIP: thankYouSlips._count._all,
      ONE_TO_ONE: oneToOnes,
      POWER_DATE: powerDates,
      CONCLAVE: conclaves,
      VISITOR: visitors,
      CONSUMER: consumers,
      CHIEF_GUEST: chiefGuests,
      INDUCTION: inductions,
      ATTENDANCE: attendances,
    },
    thankYouValueInr: thankYouSlips._sum.amountInr ?? 0,
  };
}

export async function getPointsConfig(): Promise<Record<ActivityType, PointsRule>> {
  const rows = await db.pointsConfig.findMany();
  const map = new Map(rows.map((r) => [r.activityType, { points: r.points, perUnit: r.perUnit }]));
  return Object.fromEntries(ACTIVITY_TYPES.map((type) => [type, map.get(type) ?? { points: 0, perUnit: 1 }])) as Record<
    ActivityType,
    PointsRule
  >;
}

export type ScoreBreakdownRow = {
  type: ActivityType;
  label: string;
  /** How many were recorded (slips, Power Dates, meetings attended, …). */
  count: number;
  /** What the rule is applied to — rupee total for Thank You Slips, else `count`. */
  quantity: number;
  pointsEach: number;
  perUnit: number;
  /** describeRule() — "Every ₹500 = 1 pt". */
  rule: string;
  subtotal: number;
};

type MemberActivity = { counts: Record<ActivityType, number>; thankYouValueInr: number };

function buildBreakdown(activity: MemberActivity, config: Record<ActivityType, PointsRule>): ScoreBreakdownRow[] {
  return ACTIVITY_TYPES.map((type) => {
    const count = activity.counts[type];
    const quantity = type === "THANK_YOU_SLIP" ? activity.thankYouValueInr : count;
    const rule = config[type];
    return {
      type,
      label: ACTIVITY_LABELS[type],
      count,
      quantity,
      pointsEach: rule.points,
      perUnit: rule.perUnit,
      rule: describeRule(type, rule),
      subtotal: pointsFor(quantity, rule),
    };
  });
}

/** The breakdown's "Recorded" cell — "3 slips · ₹2,500" for Thank You Slips, else the count. */
export function recordedLabel(row: Pick<ScoreBreakdownRow, "type" | "count" | "quantity">): string {
  return row.type === "THANK_YOU_SLIP" ? `${row.count} ${row.count === 1 ? "slip" : "slips"} · ${inr(row.quantity)}` : String(row.count);
}

export async function computeMemberScore(memberId: string): Promise<{ total: number; breakdown: ScoreBreakdownRow[] }> {
  const [activity, config] = await Promise.all([getMemberActivityCounts(memberId), getPointsConfig()]);
  const breakdown = buildBreakdown(activity, config);
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
async function getActivityCountsForMembers(memberIds: string[]): Promise<Map<string, MemberActivity>> {
  const counts = new Map<string, MemberActivity>(
    memberIds.map((id) => [
      id,
      {
        counts: Object.fromEntries(ACTIVITY_TYPES.map((type) => [type, 0])) as Record<ActivityType, number>,
        thankYouValueInr: 0,
      },
    ]),
  );
  if (memberIds.length === 0) return counts;

  const add = (type: ActivityType, id: string, n: number) => {
    const row = counts.get(id);
    if (row) row.counts[type] += n;
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
    attendances,
  ] = await Promise.all([
    db.referral.groupBy({ by: ["fromMemberId"], where: { fromMemberId: inScope }, _count: { _all: true } }),
    db.thankYouSlip.groupBy({
      by: ["fromMemberId"],
      where: { fromMemberId: inScope },
      _count: { _all: true },
      _sum: { amountInr: true },
    }),
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
    db.attendance.groupBy({ by: ["memberId"], where: { memberId: inScope, status: "PRESENT" }, _count: { _all: true } }),
  ]);

  referrals.forEach((r) => add("REFERRAL", r.fromMemberId, r._count._all));
  thankYouSlips.forEach((r) => {
    add("THANK_YOU_SLIP", r.fromMemberId, r._count._all);
    const row = counts.get(r.fromMemberId);
    if (row) row.thankYouValueInr += r._sum.amountInr ?? 0;
  });
  oneToOnesAsMember.forEach((r) => add("ONE_TO_ONE", r.memberId, r._count._all));
  oneToOnesAsWith.forEach((r) => add("ONE_TO_ONE", r.withMemberId, r._count._all));
  powerDates.forEach((r) => add("POWER_DATE", r.hostMemberId, r._count._all));
  conclavesOrganized.forEach((r) => add("CONCLAVE", r.organizedByMemberId, r._count._all));
  conclaveParticipations.forEach((r) => add("CONCLAVE", r.memberId, r._count._all));
  visitors.forEach((r) => r.referringMemberId && add("VISITOR", r.referringMemberId, r._count._all));
  consumers.forEach((r) => add("CONSUMER", r.memberId, r._count._all));
  chiefGuests.forEach((r) => add("CHIEF_GUEST", r.memberId, r._count._all));
  inductions.forEach((r) => r.referredByMemberId && add("INDUCTION", r.referredByMemberId, r._count._all));
  attendances.forEach((r) => add("ATTENDANCE", r.memberId, r._count._all));

  return counts;
}

/** Every member's total score + breakdown for the given set of member ids, ranked highest-first. */
export async function getLeaderboard(memberIds: string[]): Promise<LeaderboardRow[]> {
  const [countsByMember, config] = await Promise.all([getActivityCountsForMembers(memberIds), getPointsConfig()]);

  const rows: LeaderboardRow[] = memberIds.map((memberId) => {
    const breakdown = buildBreakdown(countsByMember.get(memberId)!, config);
    return { memberId, total: breakdown.reduce((sum, row) => sum + row.subtotal, 0), breakdown };
  });

  return rows.sort((a, b) => b.total - a.total);
}
