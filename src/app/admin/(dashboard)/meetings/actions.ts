"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  chapterId: z.string().min(1, "Select a chapter"),
  startsAt: z.string().min(1, "Date & time is required"),
  venue: optionalText(),
  address: optionalText(),
  googleMapsUrl: optionalText(),
  agenda: optionalText(),
  speaker: optionalText(),
  description: optionalText(),
});

export async function createMeeting(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, startsAt, ...rest } = parsed.data;
  await requireChapterAccess(chapterId, "meetings:manage");

  const meeting = await db.meeting.create({
    data: { ...rest, chapterId, startsAt: new Date(startsAt) },
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
  speaker: optionalText(),
  description: optionalText(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  visitorRegistrationEnabled: z.string().optional(),
});

export async function updateMeeting(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { meetingId, startsAt, visitorRegistrationEnabled, ...rest } = parsed.data;
  const meeting = await db.meeting.findUniqueOrThrow({ where: { id: meetingId } });
  await requireChapterAccess(meeting.chapterId, "meetings:manage");

  await db.meeting.update({
    where: { id: meetingId },
    data: {
      ...rest,
      startsAt: new Date(startsAt),
      visitorRegistrationEnabled: visitorRegistrationEnabled === "on",
    },
  });

  await logActivity({ action: "meeting.updated", entity: "Meeting", entityId: meetingId });

  revalidatePath("/admin/meetings");
  revalidatePath(`/admin/meetings/${meetingId}`);
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  return { error: undefined };
}
