"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { istInputsToUtcDate } from "@/lib/marketing/constants";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((v) => v || undefined);

function revalidateCalendar() {
  revalidatePath("/admin/marketing/calendar");
  revalidatePath("/admin/marketing");
}

const contentFormatEnum = z.enum(["REEL", "POST", "CAROUSEL", "STORY", "VIDEO", "OTHER"]);
const calendarPlatformEnum = z.enum(["INSTAGRAM", "FACEBOOK", "LINKEDIN", "YOUTUBE", "OTHER"]);
const contentPlanStatusEnum = z.enum(["PLANNED", "IN_PROGRESS", "READY", "SCHEDULED", "PUBLISHED"]);

const entrySchema = z.object({
  title: z.string().min(1, "Title is required"),
  topic: optionalText(),
  contentType: contentFormatEnum,
  platform: calendarPlatformEnum,
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  description: optionalText(),
  assignedTo: optionalText(),
  status: contentPlanStatusEnum,
});

/**
 * Client spec §2 — a real content-planning record, independent of the
 * existing MarketingContent/ScheduledPost pipeline (see the schema comment
 * on ContentPlanEntry). Used by every "add content" entry point on the
 * calendar: the "+ Add Content" button and clicking an empty date both open
 * the same form pre-filled with a date.
 */
export async function createContentPlanEntry(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  const parsed = entrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { date, time, ...rest } = parsed.data;
  const entry = await db.contentPlanEntry.create({
    data: { ...rest, scheduledFor: istInputsToUtcDate(date, time) },
  });

  await logActivity({ action: "content_plan_entry.created", entity: "ContentPlanEntry", entityId: entry.id });
  revalidateCalendar();
  return { error: undefined };
}

const updateEntrySchema = entrySchema.extend({ id: z.string() });

export async function updateContentPlanEntry(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  const parsed = updateEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { id, date, time, ...rest } = parsed.data;
  const existing = await db.contentPlanEntry.findUnique({ where: { id } });
  if (!existing) return { error: "This calendar entry no longer exists." };

  await db.contentPlanEntry.update({
    where: { id },
    data: { ...rest, scheduledFor: istInputsToUtcDate(date, time) },
  });

  await logActivity({ action: "content_plan_entry.updated", entity: "ContentPlanEntry", entityId: id });
  revalidateCalendar();
  return { error: undefined };
}

export async function deleteContentPlanEntry(id: string) {
  await requirePermission("marketing:manage");
  await db.contentPlanEntry.delete({ where: { id } });
  await logActivity({ action: "content_plan_entry.deleted", entity: "ContentPlanEntry", entityId: id });
  revalidateCalendar();
}

/** Client spec §2 — "duplicate ... existing calendar entries." Clones onto the same date/time; the copy is then freely reschedulable/editable. */
export async function duplicateContentPlanEntry(id: string) {
  await requirePermission("marketing:manage");

  const existing = await db.contentPlanEntry.findUnique({ where: { id } });
  if (!existing) return;

  const copy = await db.contentPlanEntry.create({
    data: {
      title: `${existing.title} (Copy)`,
      topic: existing.topic,
      contentType: existing.contentType,
      platform: existing.platform,
      scheduledFor: existing.scheduledFor,
      description: existing.description,
      assignedTo: existing.assignedTo,
      status: "PLANNED",
    },
  });

  await logActivity({ action: "content_plan_entry.duplicated", entity: "ContentPlanEntry", entityId: copy.id });
  revalidateCalendar();
}
