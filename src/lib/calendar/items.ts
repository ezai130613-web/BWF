import { db } from "@/lib/db";
import { formatIst, istParts, istToUtc } from "@/lib/ist";

/**
 * The homepage / admin calendar: chapter meetings (from Meeting — never
 * copied) plus the events the admin team adds (CalendarEvent). Everything the
 * client component needs is precomputed here in IST (day keys, time labels) so
 * the browser's own timezone can't shift an item to a different day.
 */

export type CalendarItem = {
  id: string;
  kind: "meeting" | "event";
  title: string;
  /** First and last IST day it covers, "YYYY-MM-DD" (string-comparable). */
  startKey: string;
  endKey: string;
  /** "7:00 am", or null for all-day events. */
  timeLabel: string | null;
  /** Chapter name, "All chapters", or null. */
  chapter: string | null;
  location: string | null;
  description: string | null;
  /** Where the item links to (public page or admin editor). */
  href: string | null;
  cancelled?: boolean;
  hidden?: boolean;
};

export function istDayKey(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const timeLabel = (d: Date) => formatIst(d, { hour: "numeric", minute: "2-digit", hour12: true });

/** Window shown: the previous month through 12 months ahead, in IST. */
function window() {
  const now = new Date();
  const { year, month } = istParts(now);
  return { from: istToUtc(year, month - 1, 1), to: istToUtc(year, month + 13, 1), todayKey: istDayKey(now) };
}

export async function getCalendarItems(opts: { admin: boolean }): Promise<{ items: CalendarItem[]; todayKey: string }> {
  const { from, to, todayKey } = window();
  const publicChapters = { status: { in: ["ACTIVE", "COMING_SOON"] as ("ACTIVE" | "COMING_SOON")[] } };

  const [meetings, events] = await Promise.all([
    db.meeting.findMany({
      where: {
        startsAt: { gte: from, lt: to },
        ...(opts.admin ? {} : { status: { not: "CANCELLED" }, chapter: publicChapters }),
      },
      include: { chapter: { select: { name: true, slug: true } } },
      orderBy: { startsAt: "asc" },
    }),
    db.calendarEvent.findMany({
      where: {
        startsAt: { lt: to },
        OR: [{ endsAt: { gte: from } }, { endsAt: null, startsAt: { gte: from } }],
        ...(opts.admin ? {} : { isPublished: true }),
      },
      include: { chapter: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const items: CalendarItem[] = [
    ...meetings.map<CalendarItem>((m) => ({
      id: `meeting-${m.id}`,
      kind: "meeting",
      title: m.title,
      startKey: istDayKey(m.startsAt),
      endKey: istDayKey(m.startsAt),
      timeLabel: timeLabel(m.startsAt),
      chapter: m.chapter.name,
      location: [m.venue, m.address].filter(Boolean).join(", ") || null,
      description: m.agenda ?? m.description ?? null,
      href: opts.admin ? `/admin/meetings/${m.id}` : `/chapters/${m.chapter.slug}`,
      cancelled: m.status === "CANCELLED",
    })),
    ...events.map<CalendarItem>((e) => {
      const end = e.endsAt && e.endsAt > e.startsAt ? e.endsAt : e.startsAt;
      return {
        id: `event-${e.id}`,
        kind: "event",
        title: e.title,
        startKey: istDayKey(e.startsAt),
        endKey: istDayKey(end),
        timeLabel: e.allDay ? null : timeLabel(e.startsAt),
        chapter: e.chapter?.name ?? "All chapters",
        location: e.location,
        description: e.description,
        href: opts.admin ? `/admin/calendar#event-${e.id}` : e.linkUrl,
        hidden: !e.isPublished,
      };
    }),
  ];

  return { items, todayKey };
}
