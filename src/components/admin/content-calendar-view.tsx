"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/admin/modal";
import { ContentPlanEntryForm, type ContentPlanEntryRow } from "@/components/admin/content-plan-entry-form";
import {
  CALENDAR_PLATFORM_LABELS,
  CONTENT_PLAN_STATUS_BADGE_CLASSES,
  CONTENT_PLAN_STATUS_LABELS,
  PLATFORM_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  formatIst,
} from "@/lib/marketing/constants";
import type { MarketingPlatform, ScheduledPostStatus } from "@/generated/prisma/client";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CalendarScheduledPost = {
  id: string;
  contentId: string;
  contentTitle: string;
  platform: MarketingPlatform;
  status: ScheduledPostStatus;
  scheduledFor: Date;
};

export type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  planEntries: ContentPlanEntryRow[];
  scheduledPosts: CalendarScheduledPost[];
};

function viewLink(view: "month" | "week" | "day", dateKey: string) {
  return `/admin/marketing/calendar?view=${view}&date=${dateKey}`;
}

/**
 * Client spec §2 — the whole point of this rewrite: every date is
 * clickable/editable, "+ Add Content" is prominent, entries show title +
 * status right on the grid, and month/week/day are all real views over the
 * same data (`page.tsx` does the range math + bucketing; this component is
 * purely rendering + the create/edit modal).
 */
export function ContentCalendarView({
  view,
  headerLabel,
  prevHref,
  nextHref,
  todayHref,
  days,
}: {
  view: "month" | "week" | "day";
  headerLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  days: CalendarDay[];
}) {
  const [modal, setModal] = useState<{ mode: "create"; date: string } | { mode: "edit"; entry: ContentPlanEntryRow } | null>(null);

  const anchorKey = days[view === "month" ? Math.floor(days.length / 2) : 0]?.dateKey ?? days[0]?.dateKey ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <Link
              key={v}
              href={viewLink(v, anchorKey)}
              className={`rounded px-3 py-1.5 text-xs font-medium capitalize ${
                v === view ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {v}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href={prevHref} className="text-sm text-neutral-600 hover:text-neutral-900">
            ← Prev
          </Link>
          <h2 className="text-sm font-semibold text-neutral-900">{headerLabel}</h2>
          <Link href={nextHref} className="text-sm text-neutral-600 hover:text-neutral-900">
            Next →
          </Link>
          <Link href={todayHref} className="text-xs font-medium text-neutral-500 underline hover:text-neutral-900">
            Today
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setModal({ mode: "create", date: view === "day" ? days[0].dateKey : anchorKey })}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Add Content
        </button>
      </div>

      {view === "day" ? (
        <DayView day={days[0]} onAdd={(date) => setModal({ mode: "create", date })} onEdit={(entry) => setModal({ mode: "edit", entry })} />
      ) : (
        <GridView view={view} days={days} onAdd={(date) => setModal({ mode: "create", date })} onEdit={(entry) => setModal({ mode: "edit", entry })} />
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit content" : "Add content"}>
        {modal ? (
          <ContentPlanEntryForm
            entry={modal.mode === "edit" ? modal.entry : undefined}
            defaultDate={modal.mode === "create" ? modal.date : undefined}
            onDone={() => setModal(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function EntryPill({ entry, onClick }: { entry: ContentPlanEntryRow; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${entry.title} — ${CALENDAR_PLATFORM_LABELS[entry.platform]}`}
      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${CONTENT_PLAN_STATUS_BADGE_CLASSES[entry.status]}`}
    >
      {entry.title}
    </button>
  );
}

function ScheduledPill({ post }: { post: CalendarScheduledPost }) {
  return (
    <Link
      href={`/admin/marketing/library/${post.contentId}`}
      title={`${post.contentTitle} — ${PLATFORM_LABELS[post.platform]}`}
      className={`block w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[post.status]}`}
    >
      {PLATFORM_LABELS[post.platform]}: {post.contentTitle}
    </Link>
  );
}

function GridView({
  view,
  days,
  onAdd,
  onEdit,
}: {
  view: "month" | "week";
  days: CalendarDay[];
  onAdd: (date: string) => void;
  onEdit: (entry: ContentPlanEntryRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <div className="grid min-w-[700px] grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-w-[700px] grid-cols-7">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className={`group relative flex flex-col gap-1 border-b border-r border-neutral-100 p-2 text-xs ${
              view === "month" ? "min-h-[110px]" : "min-h-[180px]"
            } ${day.inCurrentMonth ? "" : "bg-neutral-50/60"} ${day.isToday ? "bg-amber-50/60" : ""}`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className={`font-medium ${day.inCurrentMonth ? "text-neutral-700" : "text-neutral-400"}`}>{day.dayNumber}</span>
              <button
                type="button"
                onClick={() => onAdd(day.dateKey)}
                className="rounded px-1 text-neutral-300 opacity-0 hover:bg-neutral-100 hover:text-neutral-600 group-hover:opacity-100"
                title="Add content on this date"
              >
                +
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {day.planEntries.map((entry) => (
                <EntryPill key={entry.id} entry={entry} onClick={() => onEdit(entry)} />
              ))}
              {day.scheduledPosts.map((post) => (
                <ScheduledPill key={post.id} post={post} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({ day, onAdd, onEdit }: { day: CalendarDay; onAdd: (date: string) => void; onEdit: (entry: ContentPlanEntryRow) => void }) {
  const items = [
    ...day.planEntries.map((e) => ({ kind: "plan" as const, time: e.scheduledFor, entry: e })),
    ...day.scheduledPosts.map((p) => ({ kind: "post" as const, time: p.scheduledFor, post: p })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <button
        type="button"
        onClick={() => onAdd(day.dateKey)}
        className="self-start rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        + Add content for this day
      </button>

      {items.length === 0 ? <p className="py-6 text-center text-sm text-neutral-400">Nothing planned for this day.</p> : null}

      <div className="flex flex-col divide-y divide-neutral-100">
        {items.map((item, i) =>
          item.kind === "plan" ? (
            <button
              key={i}
              type="button"
              onClick={() => onEdit(item.entry)}
              className="flex items-center justify-between gap-4 py-3 text-left hover:bg-neutral-50"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{item.entry.title}</p>
                <p className="text-xs text-neutral-500">
                  {CALENDAR_PLATFORM_LABELS[item.entry.platform]} · {formatIst(item.entry.scheduledFor)}
                  {item.entry.assignedTo ? ` · ${item.entry.assignedTo}` : ""}
                </p>
              </div>
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CONTENT_PLAN_STATUS_BADGE_CLASSES[item.entry.status]}`}>
                {CONTENT_PLAN_STATUS_LABELS[item.entry.status]}
              </span>
            </button>
          ) : (
            <Link key={i} href={`/admin/marketing/library/${item.post.contentId}`} className="flex items-center justify-between gap-4 py-3 hover:bg-neutral-50">
              <div>
                <p className="text-sm font-medium text-neutral-900">{item.post.contentTitle}</p>
                <p className="text-xs text-neutral-500">
                  {PLATFORM_LABELS[item.post.platform]} · {formatIst(item.post.scheduledFor)} · Real scheduled post
                </p>
              </div>
              <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[item.post.status]}`}>
                {STATUS_LABELS[item.post.status]}
              </span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
