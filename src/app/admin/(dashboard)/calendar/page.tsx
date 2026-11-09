import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getCalendarItems } from "@/lib/calendar/items";
import { toIstDateTimeLocal } from "@/lib/ist";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarEventForm } from "@/components/admin/calendar-event-form";
import { AdminPageIcon } from "@/components/admin/page-icon";

export default async function AdminCalendarPage() {
  await requirePermission("content:manage");

  const [{ items, todayKey }, chapters, events] = await Promise.all([
    getCalendarItems({ admin: true }),
    db.chapter.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.calendarEvent.findMany({ orderBy: { startsAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />Calendar
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          What visitors see on the homepage calendar: every chapter meeting (added automatically from{" "}
          <Link href="/admin/meetings" className="underline hover:text-emerald-800">
            Meetings
          </Link>
          ) plus the events and activities you add below. Cancelled meetings and hidden events show here
          but not on the website. Times are IST.
        </p>
      </div>

      <CalendarView items={items} todayKey={todayKey} variant="admin" />

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Add an event or activity</h2>
        <div className="mt-4">
          <CalendarEventForm chapters={chapters} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Events &amp; activities ({events.length})</h2>
        <div className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          {events.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-400">No events added yet.</p> : null}
          {events.map((e) => (
            <details key={e.id} id={`event-${e.id}`} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium text-neutral-900">{e.title}</span>
                  <span className="text-neutral-500">
                    {e.startsAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}
                    {e.allDay ? " · all day" : ""} · {chapters.find((c) => c.id === e.chapterId)?.name ?? "All chapters"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {e.isPublished ? "Published" : "Hidden"}
                  </span>
                  <span className="text-neutral-500 group-open:hidden">Edit →</span>
                  <span className="hidden text-neutral-500 group-open:inline">Close</span>
                </span>
              </summary>
              <div className="mt-4">
                <CalendarEventForm
                  chapters={chapters}
                  event={{
                    id: e.id,
                    title: e.title,
                    description: e.description ?? "",
                    location: e.location ?? "",
                    linkUrl: e.linkUrl ?? "",
                    allDay: e.allDay,
                    startsAt: toIstDateTimeLocal(e.startsAt),
                    endsAt: e.endsAt ? toIstDateTimeLocal(e.endsAt) : "",
                    chapterId: e.chapterId ?? "",
                    isPublished: e.isPublished,
                  }}
                />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
