"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { parseIstDateTimeLocal } from "@/lib/ist";

/**
 * Admin-added calendar events/activities (2026-11-09). Meetings are managed
 * on /admin/meetings and appear on the calendar automatically; this is only
 * for everything else. Gated by content:manage (Super, Central, Website Admin).
 */
const optionalText = (max = 2000) => z.string().max(max).optional().transform((v) => v?.trim() || undefined);

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(),
  location: optionalText(300),
  linkUrl: optionalText(500).refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "The link must start with http:// or https://"),
  startsAt: z.string().min(1, "Choose a start date"),
  endsAt: optionalText(40),
  allDay: z.string().optional(),
  chapterId: optionalText(60),
  isPublished: z.string().optional(),
});

function parse(formData: FormData) {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." } as const;
  const { startsAt, endsAt, allDay, isPublished, chapterId, ...rest } = parsed.data;
  const isAllDay = allDay === "on";
  // All-day events come from a date input ("2026-11-20"); timed ones from datetime-local.
  const toDate = (v: string) => parseIstDateTimeLocal(isAllDay && !v.includes("T") ? `${v}T00:00` : v);
  const start = toDate(startsAt);
  if (!start) return { error: "Enter a valid start date and time." } as const;
  const end = endsAt ? toDate(endsAt) : null;
  if (endsAt && !end) return { error: "Enter a valid end date and time." } as const;
  if (end && end < start) return { error: "The end can't be before the start." } as const;
  return {
    data: { ...rest, startsAt: start, endsAt: end, allDay: isAllDay, chapterId: chapterId ?? null, isPublished: isPublished === "on" },
  } as const;
}

function refresh() {
  revalidatePath("/admin/calendar");
  revalidatePath("/");
}

export async function createCalendarEvent(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const session = await requirePermission("content:manage");
  const result = parse(formData);
  if ("error" in result) return { error: result.error };

  const event = await db.calendarEvent.create({ data: result.data });
  await logActivity({ userId: session.user.id, action: "calendar_event.created", entity: "CalendarEvent", entityId: event.id, metadata: { title: event.title } });
  refresh();
  return { ok: true };
}

export async function updateCalendarEvent(eventId: string, _prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const session = await requirePermission("content:manage");
  const result = parse(formData);
  if ("error" in result) return { error: result.error };

  await db.calendarEvent.update({ where: { id: eventId }, data: result.data });
  await logActivity({ userId: session.user.id, action: "calendar_event.updated", entity: "CalendarEvent", entityId: eventId, metadata: { title: result.data.title } });
  refresh();
  return { ok: true };
}

export async function deleteCalendarEvent(eventId: string) {
  const session = await requirePermission("content:manage");
  const event = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) return;
  await db.calendarEvent.delete({ where: { id: eventId } });
  await logActivity({ userId: session.user.id, action: "calendar_event.deleted", entity: "CalendarEvent", entityId: eventId, metadata: { title: event.title } });
  refresh();
}
