import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { toIstDateTimeInputs } from "@/lib/marketing/constants";
import { ContentCalendarView, type CalendarDay } from "@/components/admin/content-calendar-view";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Plain Y-M-D calendar-day arithmetic — deliberately not `Date`-timezone-based, since these are just labels, not instants. */
function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d + days);
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function todayIstKey(): string {
  return toIstDateTimeInputs(new Date()).date;
}

function calendarLink(view: string, date: string) {
  return `/admin/marketing/calendar?view=${view}&date=${date}`;
}

/**
 * Content Calendar (2026-09-18 client correction) — a real content-planning
 * and management tool, not a read-only view. Renders two independent data
 * sources on the same grid: `ContentPlanEntry` rows (the new, fully
 * editable planning records this correction adds) and real `ScheduledPost`
 * rows (unchanged from Phase 21 — this is what "update the calendar
 * automatically when content is scheduled" means: scheduling something for
 * real already produces a row this page already queries, no separate sync
 * needed). Month/week/day views share one query + bucketing pass.
 */
export default async function MarketingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  await requirePermission("marketing:manage");
  const { view: viewParam, date: dateParam } = await searchParams;
  const view = viewParam === "week" || viewParam === "day" ? viewParam : "month";
  const anchorKey = dateParam?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateParam : todayIstKey();
  const [anchorYear, anchorMonth, anchorDay] = anchorKey.split("-").map(Number);

  let dayKeys: string[];
  let headerLabel: string;
  let prevHref: string;
  let nextHref: string;
  let todayHref: string;

  if (view === "day") {
    dayKeys = [anchorKey];
    const d = new Date(Date.UTC(anchorYear, anchorMonth - 1, anchorDay));
    headerLabel = d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
    prevHref = calendarLink("day", addDaysToKey(anchorKey, -1));
    nextHref = calendarLink("day", addDaysToKey(anchorKey, 1));
    todayHref = calendarLink("day", todayIstKey());
  } else if (view === "week") {
    const weekday = new Date(Date.UTC(anchorYear, anchorMonth - 1, anchorDay)).getUTCDay();
    const weekStart = addDaysToKey(anchorKey, -weekday);
    dayKeys = Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i));
    const [wsy, wsm, wsd] = weekStart.split("-").map(Number);
    const weekEndKey = dayKeys[6];
    const [wey, wem, wed] = weekEndKey.split("-").map(Number);
    const startLabel = `${wsd} ${MONTH_NAMES[wsm - 1].slice(0, 3)}`;
    const endLabel = wsy === wey && wsm === wem ? `${wed}` : `${wed} ${MONTH_NAMES[wem - 1].slice(0, 3)}`;
    headerLabel = `${startLabel} – ${endLabel} ${wey}`;
    prevHref = calendarLink("week", addDaysToKey(anchorKey, -7));
    nextHref = calendarLink("week", addDaysToKey(anchorKey, 7));
    todayHref = calendarLink("week", todayIstKey());
  } else {
    const daysInMonth = new Date(Date.UTC(anchorYear, anchorMonth, 0)).getUTCDate();
    const firstWeekday = new Date(Date.UTC(anchorYear, anchorMonth - 1, 1)).getUTCDay();
    const monthKey = `${anchorYear}-${String(anchorMonth).padStart(2, "0")}`;
    const leading = Array.from({ length: firstWeekday }, (_, i) => addDaysToKey(`${monthKey}-01`, i - firstWeekday));
    const inMonth = Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
    const trailingCount = (7 - ((leading.length + inMonth.length) % 7)) % 7;
    const trailing = Array.from({ length: trailingCount }, (_, i) => addDaysToKey(inMonth[inMonth.length - 1], i + 1));
    dayKeys = [...leading, ...inMonth, ...trailing];
    headerLabel = `${MONTH_NAMES[anchorMonth - 1]} ${anchorYear}`;
    const prevMonthKey = addDaysToKey(`${monthKey}-01`, -1).slice(0, 7) + "-01";
    const nextMonthKey = addDaysToKey(inMonth[inMonth.length - 1], 1).slice(0, 7) + "-01";
    prevHref = calendarLink("month", prevMonthKey);
    nextHref = calendarLink("month", nextMonthKey);
    todayHref = calendarLink("month", todayIstKey());
  }

  // Widen by a day on each side in UTC — scheduledFor is stored UTC but
  // bucketed by its real IST calendar date below (+05:30 can shift a
  // timestamp into the neighboring UTC day), same technique as before.
  const rangeStart = new Date(`${dayKeys[0]}T00:00:00+05:30`);
  rangeStart.setUTCHours(rangeStart.getUTCHours() - 24);
  const rangeEnd = new Date(`${dayKeys[dayKeys.length - 1]}T23:59:59+05:30`);
  rangeEnd.setUTCHours(rangeEnd.getUTCHours() + 24);

  const [planEntries, posts] = await Promise.all([
    db.contentPlanEntry.findMany({
      where: { scheduledFor: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { scheduledFor: "asc" },
    }),
    db.scheduledPost.findMany({
      where: { scheduledFor: { gte: rangeStart, lt: rangeEnd } },
      include: { content: { select: { title: true } } },
      orderBy: { scheduledFor: "asc" },
    }),
  ]);

  const planByDate = new Map<string, typeof planEntries>();
  for (const entry of planEntries) {
    const key = toIstDateTimeInputs(entry.scheduledFor).date;
    if (!planByDate.has(key)) planByDate.set(key, []);
    planByDate.get(key)!.push(entry);
  }

  const postsByDate = new Map<string, typeof posts>();
  for (const post of posts) {
    const key = toIstDateTimeInputs(post.scheduledFor).date;
    if (!postsByDate.has(key)) postsByDate.set(key, []);
    postsByDate.get(key)!.push(post);
  }

  const days: CalendarDay[] = dayKeys.map((key) => ({
    dateKey: key,
    dayNumber: Number(key.split("-")[2]),
    inCurrentMonth: view !== "month" || key.startsWith(`${anchorYear}-${String(anchorMonth).padStart(2, "0")}`),
    isToday: key === todayIstKey(),
    planEntries: (planByDate.get(key) ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      topic: e.topic,
      contentType: e.contentType,
      platform: e.platform,
      scheduledFor: e.scheduledFor,
      description: e.description,
      assignedTo: e.assignedTo,
      status: e.status,
    })),
    scheduledPosts: (postsByDate.get(key) ?? []).map((p) => ({
      id: p.id,
      contentId: p.contentId,
      contentTitle: p.content.title,
      platform: p.platform,
      status: p.status,
      scheduledFor: p.scheduledFor,
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Content Calendar</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Plan upcoming content and track real scheduled posts, all in one place. All times shown in IST.
        </p>
      </div>

      <ContentCalendarView
        view={view}
        headerLabel={headerLabel}
        prevHref={prevHref}
        nextHref={nextHref}
        todayHref={todayHref}
        days={days}
      />
    </div>
  );
}
