"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

async function getMeetingOrThrow(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

/** Spec: "Open/Close Registration controls." A plain toggle, independent of the scheduled window below. */
export async function setRegistrationOpen(meetingId: string, open: boolean) {
  const meeting = await getMeetingOrThrow(meetingId);
  const session = await requireAdminSession();
  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  await db.meeting.update({ where: { id: meetingId }, data: { attendanceRegistrationOpen: open } });
  await logActivity({
    userId: session.user.id,
    action: open ? "attendance.registration_opened" : "attendance.registration_closed",
    entity: "Meeting",
    entityId: meetingId,
  });

  revalidatePath(`/admin/qr-codes/${meetingId}`);
}

const windowSchema = z.object({
  checkInOpensAt: z.string().optional().transform((v) => (v ? new Date(v) : null)),
  checkInClosesAt: z.string().optional().transform((v) => (v ? new Date(v) : null)),
});

/** Spec: "Allow configurable check-in opening and closing times." Optional — clearing both fields removes the schedule and leaves only the manual toggle above. */
export async function setCheckinWindow(
  meetingId: string,
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = windowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid dates.", success: false };

  const meeting = await getMeetingOrThrow(meetingId);
  const session = await requireAdminSession();
  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  if (parsed.data.checkInOpensAt && parsed.data.checkInClosesAt && parsed.data.checkInOpensAt >= parsed.data.checkInClosesAt) {
    return { error: "Check-in opening time must be before the closing time.", success: false };
  }

  await db.meeting.update({
    where: { id: meetingId },
    data: { checkInOpensAt: parsed.data.checkInOpensAt, checkInClosesAt: parsed.data.checkInClosesAt },
  });
  await logActivity({ userId: session.user.id, action: "attendance.window_updated", entity: "Meeting", entityId: meetingId });

  revalidatePath(`/admin/qr-codes/${meetingId}`);
  return { error: undefined, success: true };
}
