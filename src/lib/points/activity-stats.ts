import { db } from "@/lib/db";

/**
 * Client correction spec's Screenshot 2 (Weekly Performance) and Screenshot
 * 3 (6mo/12mo/Overall Reports) are the same shape of data — activity counts
 * within a date range — just different ranges. One function, reused for
 * both rather than duplicated. Referral/ThankYouSlip split into given/
 * received here (unlike PointsConfig's single-direction counts, which only
 * needs "your own" activity for scoring) because the spec's Reports screen
 * explicitly wants both directions shown separately.
 *
 * One-to-One/Power Date/Conclave are filtered on `metAt` (when the activity
 * happened) rather than `createdAt` (when it was recorded) — a member might
 * log something a few days after it happened, and the report should reflect
 * reality, not data-entry timing. Visitor/Referral/ThankYouSlip have no
 * separate "when it happened" field, so `createdAt` is the only option there.
 */
export type ActivityStats = {
  referralsGiven: number;
  referralsReceived: number;
  businessReceivedInr: number;
  businessGivenInr: number;
  oneToOnes: number;
  powerDates: number;
  conclaves: number;
  visitors: number;
  consumers: number;
  chiefGuests: number;
  inductions: number;
};

export async function getActivityStats(memberId: string, since?: Date): Promise<ActivityStats> {
  const createdFilter = since ? { createdAt: { gte: since } } : {};
  const metFilter = since ? { metAt: { gte: since } } : {};

  const [
    referralsGiven,
    referralsReceived,
    businessReceived,
    businessGiven,
    oneToOnes,
    powerDates,
    conclaves,
    visitors,
    consumers,
    chiefGuests,
    inductions,
  ] = await Promise.all([
    db.referral.count({ where: { fromMemberId: memberId, ...createdFilter } }),
    db.referral.count({ where: { toMemberId: memberId, ...createdFilter } }),
    db.thankYouSlip.aggregate({ where: { fromMemberId: memberId, ...createdFilter }, _sum: { amountInr: true } }),
    db.thankYouSlip.aggregate({ where: { toMemberId: memberId, ...createdFilter }, _sum: { amountInr: true } }),
    db.oneToOne.count({ where: { OR: [{ memberId }, { withMemberId: memberId }], ...metFilter } }),
    db.powerDate.count({ where: { hostMemberId: memberId, ...metFilter } }),
    db.conclave.count({
      where: { OR: [{ organizedByMemberId: memberId }, { participants: { some: { memberId } } }], ...metFilter },
    }),
    db.visitor.count({
      where: {
        referringMemberId: memberId,
        OR: [{ purposeOfVisit: null }, { purposeOfVisit: "PROSPECTIVE_MEMBER" }],
        ...createdFilter,
      },
    }),
    db.visitor.count({ where: { referringMemberId: memberId, purposeOfVisit: "END_CONSUMER", ...createdFilter } }),
    db.visitor.count({ where: { referringMemberId: memberId, purposeOfVisit: "CHIEF_GUEST", ...createdFilter } }),
    db.visitor.count({ where: { referringMemberId: memberId, status: "CONVERTED", ...createdFilter } }),
  ]);

  return {
    referralsGiven,
    referralsReceived,
    businessReceivedInr: businessReceived._sum.amountInr ?? 0,
    businessGivenInr: businessGiven._sum.amountInr ?? 0,
    oneToOnes,
    powerDates,
    conclaves,
    visitors,
    consumers,
    chiefGuests,
    inductions,
  };
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}
