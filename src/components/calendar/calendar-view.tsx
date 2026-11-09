"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarItem } from "@/lib/calendar/items";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");
/** Calendar-date arithmetic via UTC so the browser's timezone never matters. */
const keyOf = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

/**
 * Month grid of chapter meetings + admin-added events. Shared by the public
 * homepage (variant "public", light card) and /admin/calendar (variant
 * "admin"). All dates arrive as IST day keys (see src/lib/calendar/items.ts).
 */
export function CalendarView({ items, todayKey, variant = "public" }: { items: CalendarItem[]; todayKey: string; variant?: "public" | "admin" }) {
  const [ty, tm] = todayKey.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: ty, month: tm - 1 });
  const [selected, setSelected] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const lead = first.getUTCDay();
    const total = Math.ceil((lead + new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const key = keyOf(cursor.year, cursor.month, i - lead + 1);
      return { key, inMonth: Number(key.slice(5, 7)) === cursor.month + 1, day: Number(key.slice(8)) };
    });
  }, [cursor]);

  const itemsOn = (key: string) => items.filter((i) => i.startKey <= key && key <= i.endKey);

  const monthPrefix = `${cursor.year}-${pad(cursor.month + 1)}`;
  const monthItems = items
    .filter((i) => i.endKey >= `${monthPrefix}-01` && i.startKey <= `${monthPrefix}-31`)
    .sort((a, b) => a.startKey.localeCompare(b.startKey) || (a.timeLabel ?? "").localeCompare(b.timeLabel ?? ""));
  const listed = selected ? itemsOn(selected) : monthItems;

  const move = (delta: number) => {
    setSelected(null);
    setCursor(({ year, month }) => {
      const d = new Date(Date.UTC(year, month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  };

  const chip = (i: CalendarItem) =>
    i.kind === "meeting"
      ? i.cancelled
        ? "bg-red-50 text-red-700 line-through"
        : "bg-emerald-800 text-ivory-100"
      : i.hidden
        ? "bg-neutral-200 text-neutral-600"
        : "bg-gold-400/90 text-emerald-950";

  const navBtn = "inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-emerald-900 hover:bg-neutral-50";

  return (
    <div className={variant === "admin" ? "rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-6" : "rounded-3xl bg-white p-4 shadow-lg ring-1 ring-black/5 sm:p-8"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl text-emerald-950">
          {MONTHS[cursor.month]} {cursor.year}
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-neutral-50" onClick={() => { setSelected(null); setCursor({ year: ty, month: tm - 1 }); }}>
            Today
          </button>
          <button type="button" aria-label="Previous month" className={navBtn} onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next month" className={navBtn} onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-800" />Chapter meeting</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gold-400" />Event / activity</span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 text-sm">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-neutral-50 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const dayItems = itemsOn(c.key);
          const isToday = c.key === todayKey;
          const isSel = c.key === selected;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelected(isSel ? null : c.key)}
              aria-pressed={isSel}
              aria-label={`${c.day} ${MONTHS[Number(c.key.slice(5, 7)) - 1]}${dayItems.length ? `, ${dayItems.length} item${dayItems.length > 1 ? "s" : ""}` : ""}`}
              className={`flex min-h-[3.75rem] flex-col items-stretch gap-0.5 p-1 text-left align-top sm:min-h-[6rem] sm:p-1.5 ${c.inMonth ? "bg-white" : "bg-neutral-50 text-neutral-400"} ${isSel ? "ring-2 ring-inset ring-emerald-700" : "hover:bg-emerald-50/40"}`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs ${isToday ? "bg-emerald-800 font-semibold text-white" : c.inMonth ? "text-neutral-800" : ""}`}>
                {c.day}
              </span>
              {/* Phones: dots. Larger screens: titled chips. */}
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {dayItems.slice(0, 4).map((i) => (
                  <span key={i.id} className={`h-1.5 w-1.5 rounded-full ${i.kind === "meeting" ? "bg-emerald-800" : "bg-gold-500"}`} />
                ))}
              </span>
              <span className="hidden flex-col gap-0.5 sm:flex">
                {dayItems.slice(0, 2).map((i) => (
                  <span key={i.id} className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${chip(i)}`}>
                    {i.title}
                  </span>
                ))}
                {dayItems.length > 2 ? <span className="px-1 text-[11px] text-neutral-500">+{dayItems.length - 2} more</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-emerald-950">
          {selected ? `On ${Number(selected.slice(8))} ${MONTHS[Number(selected.slice(5, 7)) - 1]} ${selected.slice(0, 4)}` : `This month`}
          {selected ? (
            <button type="button" onClick={() => setSelected(null)} className="ml-3 text-xs font-normal text-neutral-500 underline hover:text-emerald-800">
              Show whole month
            </button>
          ) : null}
        </h4>
        {listed.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">{selected ? "Nothing scheduled on this day." : "Nothing scheduled this month."}</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {listed.map((i) => (
              <li key={i.id} className="flex gap-4 py-3">
                <div className="w-14 flex-shrink-0 text-center">
                  <div className="text-xl font-semibold leading-none text-emerald-900">{Number(i.startKey.slice(8))}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">{MONTHS[Number(i.startKey.slice(5, 7)) - 1].slice(0, 3)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${i.kind === "meeting" ? "bg-emerald-50 text-emerald-800" : "bg-gold-400/25 text-emerald-950"}`}>
                      {i.kind === "meeting" ? "Meeting" : "Event"}
                    </span>
                    {i.cancelled ? <span className="text-[11px] font-medium text-red-700">Cancelled</span> : null}
                    {i.hidden ? <span className="text-[11px] font-medium text-neutral-500">Hidden from website</span> : null}
                  </div>
                  <p className="mt-1 font-medium text-neutral-900">
                    {i.href ? (
                      <Link href={i.href} className="hover:text-emerald-800 hover:underline" {...(i.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {i.title}
                      </Link>
                    ) : (
                      i.title
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-600">
                    {[
                      i.endKey !== i.startKey ? `until ${Number(i.endKey.slice(8))} ${MONTHS[Number(i.endKey.slice(5, 7)) - 1].slice(0, 3)}` : null,
                      i.timeLabel,
                      i.chapter,
                      i.location,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {i.description ? <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{i.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
