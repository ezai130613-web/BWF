import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { PLATFORM_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS, toIstDateTimeInputs } from "@/lib/marketing/constants";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLink(year: number, month: number) {
  return `/admin/marketing/calendar?month=${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Brief §9 — Publishing Calendar. Ships as a month-grid view for now, the
 * most useful default; day/week toggles are a natural fast-follow on top of
 * the same data, not built this batch to keep scope contained.
 */
export default async function MarketingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requirePermission("marketing:manage");
  const { month: monthParam } = await searchParams;

  const now = new Date();
  const [year, month] = monthParam?.match(/^\d{4}-\d{2}$/)
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  // Widen the query by a day on each side since scheduledFor is stored UTC
  // but bucketed by its IST calendar date below (+05:30 can shift a post
  // into the neighboring UTC day).
  const queryStart = new Date(Date.UTC(year, month - 1, 1) - 24 * 3600 * 1000);
  const queryEnd = new Date(Date.UTC(year, month, 1) + 24 * 3600 * 1000);

  const posts = await db.scheduledPost.findMany({
    where: { scheduledFor: { gte: queryStart, lt: queryEnd } },
    include: { content: { select: { title: true } } },
    orderBy: { scheduledFor: "asc" },
  });

  const byDate = new Map<string, typeof posts>();
  for (const post of posts) {
    const istDate = toIstDateTimeInputs(post.scheduledFor).date;
    if (!istDate.startsWith(monthKey)) continue;
    if (!byDate.has(istDate)) byDate.set(istDate, []);
    byDate.get(istDate)!.push(post);
  }

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Publishing Calendar</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">All times shown in IST.</p>
      </div>

      <div className="flex items-center justify-between">
        <Link href={monthLink(prevMonth.year, prevMonth.month)} className="text-sm text-neutral-600 hover:text-neutral-900">
          ← {MONTH_NAMES[prevMonth.month - 1]}
        </Link>
        <h2 className="text-sm font-semibold text-neutral-900">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Link href={monthLink(nextMonth.year, nextMonth.month)} className="text-sm text-neutral-600 hover:text-neutral-900">
          {MONTH_NAMES[nextMonth.month - 1]} →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <div className="grid min-w-[700px] grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-w-[700px] grid-cols-7">
          {cells.map((day, i) => {
            const dateKey = day ? `${monthKey}-${String(day).padStart(2, "0")}` : null;
            const dayPosts = dateKey ? byDate.get(dateKey) ?? [] : [];
            return (
              <div key={i} className="min-h-[100px] border-b border-r border-neutral-100 p-2 text-xs">
                {day ? <p className="mb-1 font-medium text-neutral-500">{day}</p> : null}
                <div className="flex flex-col gap-1">
                  {dayPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/admin/marketing/library/${post.contentId}`}
                      className={`truncate rounded px-1.5 py-0.5 ${STATUS_BADGE_CLASSES[post.status]}`}
                      title={`${post.content.title} — ${PLATFORM_LABELS[post.platform]} — ${STATUS_LABELS[post.status]}`}
                    >
                      {PLATFORM_LABELS[post.platform]}: {post.content.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
