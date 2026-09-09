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
 * metric in this project). VISITOR/CONSUMER/CHIEF_GUEST/INDUCTION all derive
 * from the *existing* public Visitor model rather than a new one — see the
 * PointsConfig schema comment for why.
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
    db.visitor.count({ where: { referringMemberId: memberId, purposeOfVisit: "END_CONSUMER" } }),
    db.visitor.count({ where: { referringMemberId: memberId, purposeOfVisit: "CHIEF_GUEST" } }),
    db.visitor.count({ where: { referringMemberId: memberId, status: "CONVERTED" } }),
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
