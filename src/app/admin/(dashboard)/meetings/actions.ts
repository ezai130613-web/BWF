"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getChapterScope, requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { nextMonthOf, planMonthMeetings } from "@/lib/meetings/generate";
import { istDayRange, parseIstDateTimeLocal } from "@/lib/ist";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  chapterId: z.string().min(1, "Select a chapter"),
  startsAt: z.string().min(1, "Date & time is required"),
  venue: optionalText(),
  address: optionalText(),
  googleMapsUrl: optionalText(),
  agenda: optionalText(),
  chiefGuestId: optionalText(),
  description: optionalText(),
  reminderEnabled: z.string().optional(),
});

export async function createMeeting(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, startsAt: startsAtInput, reminderEnabled, ...rest } = parsed.data;
  await requireChapterAccess(chapterId, "meetings:manage");

  // Admins enter Chennai wall-clock time; parse it as IST explicitly so a
  // UTC host doesn't shift every meeting by 5½ hours.
  const startsAt = parseIstDateTimeLocal(startsAtInput);
  if (!startsAt) return { error: "Enter a valid date & time." };

  if (rest.chiefGuestId) {
    const chiefGuest = await db.chiefGuest.findUniqueOrThrow({ where: { id: rest.chiefGuestId } });
    if (chiefGuest.chapterId && chiefGuest.chapterId !== chapterId) {
      return { error: "That Chief Guest belongs to a different chapter." };
    }
  }

  const meeting = await db.meeting.create({
    data: { ...rest, chapterId, startsAt, reminderEnabled: reminderEnabled === "on" },
  });

  await logActivity({
    action: "meeting.created",
    entity: "Meeting",
    entityId: meeting.id,
    metadata: { chapterId },
  });

  revalidatePath("/admin/meetings");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  return { error: undefined };
}

const updateSchema = z.object({
  meetingId: z.string(),
  title: z.string().min(1, "Title is required"),
  startsAt: z.string().min(1, "Date & time is required"),
  venue: optionalText(),
  address: optionalText(),
  googleMapsUrl: optionalText(),
  agenda: optionalText(),
  chiefGuestId: optionalText(),
  description: optionalText(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  visitorRegistrationEnabled: z.string().optional(),
  reminderEnabled: z.string().optional(),
});

export async function updateMeeting(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { meetingId, startsAt: startsAtInput, visitorRegistrationEnabled, reminderEnabled, ...rest } = parsed.data;
  const meeting = await db.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  await requireChapterAccess(meeting.chapterId, "meetings:manage");

  const startsAt = parseIstDateTimeLocal(startsAtInput);
  if (!startsAt) return { error: "Enter a valid date & time." };
  // A new date deserves its own reminder — reset the processed state so the
  // cron sends again 2 days before the new date (unless already underway).
  const dateChanged = startsAt.getTime() !== meeting.startsAt.getTime();
  const resetReminder = dateChanged && meeting.reminderStatus !== "SENDING";

  if (rest.chiefGuestId) {
    const chiefGuest = await db.chiefGuest.findUniqueOrThrow({ where: { id: rest.chiefGuestId } });
    if (chiefGuest.chapterId && chiefGuest.chapterId !== meeting.chapterId) {
      return { error: "That Chief Guest belongs to a different chapter." };
    }
  }

  await db.meeting.update({
    where: { id: meetingId },
    data: {
      ...rest,
      startsAt,
      visitorRegistrationEnabled: visitorRegistrationEnabled === "on",
      reminderEnabled: reminderEnabled === "on",
      ...(resetReminder ? { reminderStatus: null, reminderProcessedAt: null } : {}),
    },
  });

  await logActivity({ action: "meeting.updated", entity: "Meeting", entityId: meetingId });

  revalidatePath("/admin/meetings");
  revalidatePath(`/admin/meetings/${meetingId}`);
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  return { error: undefined };
}

export type GeneratedMeetingResult = {
  error?: string;
  created?: { id: string; chapterName: string; startsAt: string }[];
  skipped?: { chapterName: string; startsAt: string; reason: string }[];
};

/**
 * "Create Next Month's Meetings" confirm step. Re-plans server-side (never
 * trusts the preview the browser saw) and re-checks for an existing
 * meeting inside the transaction, under a Postgres advisory lock, so a
 * double-click or two admins confirming at once can't create duplicates.
 */
export async function createNextMonthMeetings(target: { year: number; month: number }): Promise<GeneratedMeetingResult> {
  const scope = await getChapterScope("meetings:manage");
  const session = await requireAdminSession();
  const expected = nextMonthOf(new Date());
  if (target.year !== expected.year || target.month !== expected.month) {
    return { error: "The month changed since this preview was opened — reload the page and review again." };
  }

  const plan = await planMonthMeetings(target, scope);
  const created: NonNullable<GeneratedMeetingResult["created"]> = [];
  const skipped: NonNullable<GeneratedMeetingResult["skipped"]> = [];

  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('bwf:generate-meetings'))`;
      for (const m of plan.meetings) {
        const [dayStart, dayEnd] = istDayRange(m.startsAt);
        const clash = await tx.meeting.findFirst({
          where: { chapterId: m.chapterId, startsAt: { gte: dayStart, lt: dayEnd } },
          select: { id: true },
        });
        if (clash) {
          skipped.push({ chapterName: m.chapterName, startsAt: m.startsAt.toISOString(), reason: "A meeting already exists on this date" });
          continue;
        }
        const meeting = await tx.meeting.create({
          data: {
            title: m.title,
            agenda: m.agenda,
            chapterId: m.chapterId,
            startsAt: m.startsAt,
            venue: m.venue,
            address: m.address,
            googleMapsUrl: m.googleMapsUrl,
            // Chief Guest deliberately left unassigned; reminder on by default.
            reminderEnabled: true,
          },
        });
        created.push({ id: meeting.id, chapterName: m.chapterName, startsAt: m.startsAt.toISOString() });
      }
    },
    { timeout: 20000, maxWait: 5000 },
  );

  for (const c of plan.unconfigured) {
    skipped.push({ chapterName: c.chapterName, startsAt: "", reason: `Chapter schedule incomplete (${c.missing.join(", ")})` });
  }

  await logActivity({
    userId: session.user.id,
    action: "meeting.month_generated",
    entity: "Meeting",
    metadata: { month: plan.label, created: created.length, skipped: skipped.length },
  });

  revalidatePath("/admin/meetings");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  return { created, skipped };
}
