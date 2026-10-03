import { db } from "@/lib/db";
import { istDayRange, istParts, istToUtc, parseTimeOfDay } from "@/lib/ist";

/**
 * "Create Next Month's Meetings" (2026-10-03). Builds each ACTIVE chapter's
 * meetings for the next IST calendar month from its structured recurring
 * schedule (Chapter.meetingWeekday/meetingWeeksOfMonth/meetingTime). Public
 * holidays are deliberately ignored — BWF meets on schedule regardless.
 * The same function produces the admin's preview and the real creation
 * list, so what the admin confirms is exactly what gets created.
 */

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Client's standard venue when a chapter has none configured. */
export const DEFAULT_MEETING_VENUE = "Aditya";

export type PlannedMeeting = {
  chapterId: string;
  chapterName: string;
  title: string;
  agenda: string;
  startsAt: Date;
  venue: string;
  address: string | null;
  googleMapsUrl: string | null;
  /** Set when a meeting already exists for this chapter on this IST date. */
  existingMeetingId: string | null;
};

export type UnconfiguredChapter = { chapterId: string; chapterName: string; missing: string[] };

export type MonthPlan = {
  year: number;
  /** 0-based */
  month: number;
  label: string;
  meetings: PlannedMeeting[];
  unconfigured: UnconfiguredChapter[];
};

/** IST year/month after the one `now` falls in. */
export function nextMonthOf(now: Date): { year: number; month: number } {
  const { year, month } = istParts(now);
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

/** Day-of-month of the nth (1-based) given weekday, or null if that month has no such occurrence. */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): number | null {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return day <= daysInMonth ? day : null;
}

export async function planMonthMeetings(
  target: { year: number; month: number },
  chapterScope: "ALL" | string,
): Promise<MonthPlan> {
  const chapters = await db.chapter.findMany({
    where: { status: "ACTIVE", ...(chapterScope === "ALL" ? {} : { id: chapterScope }) },
    orderBy: { name: "asc" },
  });

  const monthStart = istToUtc(target.year, target.month, 1);
  const monthEnd = istToUtc(target.year, target.month + 1, 1);
  const existing = await db.meeting.findMany({
    where: { chapterId: { in: chapters.map((c) => c.id) }, startsAt: { gte: monthStart, lt: monthEnd } },
    select: { id: true, chapterId: true, startsAt: true },
  });

  const meetings: PlannedMeeting[] = [];
  const unconfigured: UnconfiguredChapter[] = [];
  const monthLabel = `${MONTH_NAMES[target.month]} ${target.year}`;

  for (const chapter of chapters) {
    const time = parseTimeOfDay(chapter.meetingTime);
    const weekday = chapter.meetingWeekday;
    const weeks = [...new Set(chapter.meetingWeeksOfMonth)].filter((w) => w >= 1 && w <= 5).sort((a, b) => a - b);

    const missing = [
      weekday === null || weekday < 0 || weekday > 6 ? "meeting day" : null,
      weeks.length === 0 ? "weeks of the month" : null,
      time ? null : "start time",
    ].filter((m): m is string => m !== null);
    if (missing.length > 0 || weekday === null || !time) {
      unconfigured.push({ chapterId: chapter.id, chapterName: chapter.name, missing });
      continue;
    }

    let sequence = 0;
    for (const nth of weeks) {
      const day = nthWeekdayOfMonth(target.year, target.month, weekday, nth);
      if (day === null) continue;
      sequence += 1;
      const startsAt = istToUtc(target.year, target.month, day, time.hours, time.minutes);
      const [dayStart, dayEnd] = istDayRange(startsAt);
      const clash = existing.find((m) => m.chapterId === chapter.id && m.startsAt >= dayStart && m.startsAt < dayEnd);

      meetings.push({
        chapterId: chapter.id,
        chapterName: chapter.name,
        title: `BWF ${chapter.name} ${WEEKDAY_NAMES[weekday]} Meeting`,
        agenda: `${chapter.name} Meeting (${ORDINALS[sequence] ?? `${sequence}th`} meeting in ${monthLabel})`,
        startsAt,
        venue: chapter.meetingVenue?.trim() || DEFAULT_MEETING_VENUE,
        address: chapter.meetingAddress?.trim() || null,
        googleMapsUrl: chapter.googleMapsUrl?.trim() || null,
        existingMeetingId: clash?.id ?? null,
      });
    }
  }

  meetings.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.chapterName.localeCompare(b.chapterName));
  return { year: target.year, month: target.month, label: monthLabel, meetings, unconfigured };
}
