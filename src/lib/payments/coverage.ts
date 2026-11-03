import { db } from "@/lib/db";
import { istParts } from "@/lib/ist";
import { nthWeekdayOfMonth } from "@/lib/meetings/generate";
import type { MonthYear } from "@/lib/attendance/manage";
import { addMonthsKey, dayBefore, dbDateKey, istDateKey, keyToDbDate, meetingsPerMonth, pad } from "@/lib/payments/dates";

export * from "@/lib/payments/dates";

/**
 * Meeting-date payments (2026-11-03, client spec). The monthly meeting fee
 * now pays for specific chapter meetings rather than calendar months:
 * "1 month" = the chapter's meetings-per-month (2 for every chapter today),
 * counted from the member's next unpaid meeting. That is what makes a member
 * who joins mid-month pay "from the middle of this month to the middle of
 * the next", and lets Accounts and the member see exactly which meetings a
 * payment covers.
 *
 * Dates are IST calendar days, carried as "YYYY-MM-DD" strings in code and
 * stored in Payment.meetingDates (@db.Date) as UTC midnight of that day.
 */

export type MeetingDay = {
  /** "YYYY-MM-DD" (IST calendar day). */
  date: string;
  /** The real Meeting row when one exists; projected from the chapter schedule otherwise. */
  meetingId: string | null;
};

export type ChapterSchedule = { id: string; meetingWeekday: number | null; meetingWeeksOfMonth: number[] };

function projectedMonth(chapter: ChapterSchedule, year: number, month0: number): string[] {
  if (chapter.meetingWeekday === null || !chapter.meetingWeeksOfMonth.length) return [];
  return chapter.meetingWeeksOfMonth
    .map((nth) => nthWeekdayOfMonth(year, month0, chapter.meetingWeekday!, nth))
    .filter((d): d is number => d !== null)
    .map((d) => `${year}-${pad(month0 + 1)}-${pad(d)}`);
}

/**
 * Every meeting day of a chapter between two IST days (inclusive). A month
 * that already has Meeting rows uses those real dates (so a rescheduled
 * meeting is respected and a cancelled one dropped); a month not generated
 * yet is projected from the chapter's weekday/weeks-of-month schedule, so a
 * member can pay up to a year ahead.
 */
export async function chapterMeetingDays(chapter: ChapterSchedule, fromKey: string, toKey: string): Promise<MeetingDay[]> {
  const from = keyToDbDate(fromKey);
  const to = keyToDbDate(toKey);
  const meetings = await db.meeting.findMany({
    where: {
      chapterId: chapter.id,
      // Widen by a day each side: startsAt is an instant, the keys are IST days.
      startsAt: { gte: new Date(from.getTime() - 86_400_000), lt: new Date(to.getTime() + 2 * 86_400_000) },
    },
    select: { id: true, startsAt: true, status: true },
    orderBy: { startsAt: "asc" },
  });

  const byMonth = new Map<string, { id: string; key: string; cancelled: boolean }[]>();
  for (const m of meetings) {
    const key = istDateKey(m.startsAt);
    const month = key.slice(0, 7);
    const list = byMonth.get(month) ?? [];
    list.push({ id: m.id, key, cancelled: m.status === "CANCELLED" });
    byMonth.set(month, list);
  }

  const days: MeetingDay[] = [];
  const [fy, fm] = fromKey.split("-").map(Number);
  const [ty, tm] = toKey.split("-").map(Number);
  for (let y = fy, m0 = fm - 1; y < ty || (y === ty && m0 <= tm - 1); m0 === 11 ? (y++, (m0 = 0)) : m0++) {
    const monthKey = `${y}-${pad(m0 + 1)}`;
    const real = byMonth.get(monthKey);
    const monthDays: MeetingDay[] = real
      ? real.filter((r) => !r.cancelled).map((r) => ({ date: r.key, meetingId: r.id }))
      : projectedMonth(chapter, y, m0).map((date) => ({ date, meetingId: null }));
    for (const d of monthDays) {
      if (d.date >= fromKey && d.date <= toKey && !days.some((x) => x.date === d.date)) days.push(d);
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export type CoverageSets = { approved: Set<string>; pending: Set<string> };

const COUNTED_PENDING = ["PENDING_APPROVAL", "CLARIFICATION_REQUESTED"] as const;

/** Meeting dates a member has paid for (APPROVED) or submitted proof for (awaiting approval). */
export async function memberMeetingCoverage(memberId: string): Promise<CoverageSets> {
  const payments = await db.payment.findMany({
    where: { memberId, type: "MEETING", status: { in: ["APPROVED", ...COUNTED_PENDING] } },
    select: { status: true, meetingDates: true },
  });
  const approved = new Set<string>();
  const pending = new Set<string>();
  for (const p of payments) {
    for (const d of p.meetingDates) (p.status === "APPROVED" ? approved : pending).add(dbDateKey(d));
  }
  for (const k of approved) pending.delete(k);
  return { approved, pending };
}

export type MembershipStanding = "APPROVED" | "PENDING" | null;

export async function membershipStanding(memberId: string, year: number): Promise<MembershipStanding> {
  const rows = await db.payment.findMany({
    where: { memberId, type: "MEMBERSHIP", membershipYear: year, status: { in: ["APPROVED", ...COUNTED_PENDING] } },
    select: { status: true },
  });
  if (rows.some((r) => r.status === "APPROVED")) return "APPROVED";
  return rows.length ? "PENDING" : null;
}

/** The member's first payable day: today, or their joining day if later (IST). */
function startKeyFor(joinedAt: Date, now: Date): string {
  const today = istDateKey(now);
  const joined = istDateKey(joinedAt);
  return joined > today ? joined : today;
}

/**
 * The member's next meetings not yet paid for or awaiting approval, from
 * today (a meeting today still counts — same-day payment is allowed), enough
 * for `months` months. What the member's "how many months" dropdown fills in.
 */
export async function nextUnpaidMeetingDays(
  member: { id: string; joinedAt: Date; chapter: ChapterSchedule },
  months: number,
  now = new Date(),
): Promise<MeetingDay[]> {
  const coverage = await memberMeetingCoverage(member.id);
  const fromKey = startKeyFor(member.joinedAt, now);
  const needed = months * meetingsPerMonth(member.chapter);
  // Look far enough ahead for a full year plus whatever is already paid.
  const toKey = addMonthsKey(fromKey, Math.max(months, 12) + 12 + 1);
  const days = await chapterMeetingDays(member.chapter, fromKey, toKey);
  return days.filter((d) => !coverage.approved.has(d.date) && !coverage.pending.has(d.date)).slice(0, needed);
}

/**
 * Converts the older month-based selection (web before this change, and
 * app 1.0/1.1) into the chapter's meeting dates in those months.
 */
export async function meetingDaysForMonths(chapter: ChapterSchedule, months: MonthYear[]): Promise<string[]> {
  const keys: string[] = [];
  for (const m of months) {
    const from = `${m.year}-${pad(m.month)}-01`;
    const to = `${m.year}-${pad(m.month)}-${pad(new Date(Date.UTC(m.year, m.month, 0)).getUTCDate())}`;
    for (const d of await chapterMeetingDays(chapter, from, to)) keys.push(d.date);
  }
  return [...new Set(keys)].sort();
}

export type MemberDues = {
  /** The next meeting from today and whether it's paid. */
  nextMeeting: { date: string; payBy: string; status: "APPROVED" | "PENDING" | null } | null;
  /** Unpaid (and not awaiting approval) meetings in the next ~2 months. */
  unpaidSoon: string[];
  /** Approved meetings, continuous from the next meeting. */
  paidThrough: string | null;
  membership: { year: number; status: MembershipStanding };
  /** Anything to pay right now: the next meeting or this year's membership. */
  isDue: boolean;
};

/** "You're due for payment" — shown on the member's Payments page, dashboard and app. */
export async function getMemberDues(
  member: { id: string; joinedAt: Date; chapter: ChapterSchedule },
  now = new Date(),
): Promise<MemberDues> {
  const fromKey = startKeyFor(member.joinedAt, now);
  const [coverage, days, membership] = await Promise.all([
    memberMeetingCoverage(member.id),
    chapterMeetingDays(member.chapter, fromKey, addMonthsKey(fromKey, 14)),
    membershipStanding(member.id, istParts(now).year),
  ]);
  const status = (k: string): "APPROVED" | "PENDING" | null =>
    coverage.approved.has(k) ? "APPROVED" : coverage.pending.has(k) ? "PENDING" : null;
  const next = days[0];
  let paidThrough: string | null = null;
  for (const d of days) {
    if (!coverage.approved.has(d.date)) break;
    paidThrough = d.date;
  }
  const soonLimit = addMonthsKey(fromKey, 2);
  const unpaidSoon = days.filter((d) => d.date <= soonLimit && status(d.date) === null).map((d) => d.date);
  const nextMeeting = next ? { date: next.date, payBy: dayBefore(next.date), status: status(next.date) } : null;
  return {
    nextMeeting,
    unpaidSoon,
    paidThrough,
    membership: { year: istParts(now).year, status: membership },
    isDue: (nextMeeting !== null && nextMeeting.status === null) || membership === null,
  };
}

export type AttendancePaymentCheck = { ok: true } | { ok: false; error: string };

/**
 * Check-in rule (client, 2026-11-03): with "Attendance requires payment" on,
 * a member can check in only if BOTH this meeting's date is covered by an
 * APPROVED meeting payment AND that year's membership is APPROVED. Payment
 * on the meeting day itself is fine.
 */
export async function checkAttendancePayment(memberId: string, meetingStartsAt: Date): Promise<AttendancePaymentCheck> {
  const key = istDateKey(meetingStartsAt);
  const year = Number(key.slice(0, 4));
  const [coverage, membership] = await Promise.all([memberMeetingCoverage(memberId), membershipStanding(memberId, year)]);
  const meetingOk = coverage.approved.has(key);
  const membershipOk = membership === "APPROVED";
  if (meetingOk && membershipOk) return { ok: true };

  const missing: string[] = [];
  if (!meetingOk) missing.push(coverage.pending.has(key) ? "this meeting's fee (your payment is awaiting approval)" : "this meeting's fee");
  if (!membershipOk) missing.push(membership === "PENDING" ? `your ${year} membership (awaiting approval)` : `your ${year} membership`);
  return {
    ok: false,
    error: `Your payment is not yet made for ${missing.join(" and ")}. Go to Payments and make the payment, then check in again.`,
  };
}

export type MeetingSelection = { dates: string[]; numberOfMonths: number };

const MEMBER_FOR_COVERAGE = {
  id: true,
  joinedAt: true,
  chapter: { select: { id: true, meetingWeekday: true, meetingWeeksOfMonth: true } },
} as const;

export async function loadMemberForCoverage(memberId: string) {
  return db.member.findUniqueOrThrow({ where: { id: memberId }, select: MEMBER_FOR_COVERAGE });
}

/**
 * Which meetings a member's meeting payment covers. Current web/app send
 * `monthsToPay` (1–12) and the server picks the next unpaid meetings — never
 * trusting dates from the browser. Older clients (web before 2026-11-03,
 * app 1.0/1.1) send numberOfMonths + month_i/year_i; those months are
 * converted to the chapter's meeting dates in them.
 */
export async function resolveMemberMeetingSelection(
  memberId: string,
  formData: { get(name: string): FormDataEntryValue | null },
): Promise<{ data: MeetingSelection; error?: undefined } | { data?: undefined; error: string }> {
  const member = await loadMemberForCoverage(memberId);
  const monthsToPay = formData.get("monthsToPay");
  if (monthsToPay !== null) {
    const months = Number(monthsToPay);
    if (!Number.isInteger(months) || months < 1 || months > 12) return { error: "Select how many months to pay for (1 to 12)." };
    const days = await nextUnpaidMeetingDays(member, months);
    if (!days.length) return { error: "No upcoming meetings were found for your chapter — please contact BWF." };
    return { data: { dates: days.map((d) => d.date), numberOfMonths: months } };
  }

  const numberOfMonths = Number(formData.get("numberOfMonths"));
  if (!Number.isInteger(numberOfMonths) || numberOfMonths < 1 || numberOfMonths > 24) return { error: "Select the number of months." };
  const months: MonthYear[] = [];
  for (let i = 0; i < numberOfMonths; i++) {
    const month = Number(formData.get(`month_${i}`));
    const year = Number(formData.get(`year_${i}`));
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
      return { error: "Select the month and year for every month covered." };
    }
    months.push({ month, year });
  }
  const dates = await meetingDaysForMonths(member.chapter, months);
  if (!dates.length) return { error: "No meetings were found for your chapter in those months — please contact BWF." };
  return { data: { dates, numberOfMonths } };
}

/** True if any of these dates is already covered by an APPROVED meeting payment (flagged for review, never auto-rejected). */
export async function overlapsApprovedDates(memberId: string, dates: string[]): Promise<boolean> {
  const { approved } = await memberMeetingCoverage(memberId);
  return dates.some((d) => approved.has(d));
}

/** Whether one meeting's date is paid (APPROVED), awaiting approval (PENDING), or not paid (null). */
export async function meetingCoverageFor(memberId: string, meetingStartsAt: Date): Promise<"APPROVED" | "PENDING" | null> {
  const key = istDateKey(meetingStartsAt);
  const { approved, pending } = await memberMeetingCoverage(memberId);
  return approved.has(key) ? "APPROVED" : pending.has(key) ? "PENDING" : null;
}

export type MeetingTileStatus = "PAID" | "PENDING" | "DUE" | "NO_RECORD" | "UPCOMING";
export type MeetingTile = { date: string; label: string; status: MeetingTileStatus; next: boolean };

/**
 * The member's meeting-by-meeting fee dashboard (replaces the month grid,
 * 2026-11-03): the last 2 months' meetings (from their joining date) and the
 * next 12 months'. PAID = approved; PENDING = screenshot awaiting approval;
 * DUE = the next meeting, unpaid; NO_RECORD = an earlier meeting with nothing
 * on record (payments made before the website aren't shown); UPCOMING = later.
 */
export async function memberMeetingTiles(
  member: { id: string; joinedAt: Date; chapter: ChapterSchedule },
  now = new Date(),
): Promise<MeetingTile[]> {
  const today = istDateKey(now);
  const joined = istDateKey(member.joinedAt);
  const back = addMonthsKey(today, -2);
  const fromKey = joined > back ? joined : back;
  const [coverage, days] = await Promise.all([
    memberMeetingCoverage(member.id),
    chapterMeetingDays(member.chapter, fromKey, addMonthsKey(today, 12)),
  ]);
  const nextDate = days.find((d) => d.date >= today)?.date ?? null;
  return days.map(({ date }) => {
    const d = keyToDbDate(date);
    const label = `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const status: MeetingTileStatus = coverage.approved.has(date)
      ? "PAID"
      : coverage.pending.has(date)
        ? "PENDING"
        : date === nextDate
          ? "DUE"
          : date < today
            ? "NO_RECORD"
            : "UPCOMING";
    return { date, label, status, next: date === nextDate };
  });
}

/** Everything the member's Payments screens need (web page and app). */
export async function getMemberPaymentContext(memberId: string, now = new Date()) {
  const member = await loadMemberForCoverage(memberId);
  const perMonth = meetingsPerMonth(member.chapter);
  const [dues, tiles, upcoming] = await Promise.all([
    getMemberDues(member, now),
    memberMeetingTiles(member, now),
    nextUnpaidMeetingDays(member, 12, now),
  ]);
  return { perMonth, dues, tiles, upcoming: upcoming.map((d) => d.date) };
}
