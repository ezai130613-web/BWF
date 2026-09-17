"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

async function getMeetingOrThrow(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

/** Spec: "registration open/close controls" for the visitor QR — a plain toggle, no scheduled window (unlike member check-in, the spec doesn't ask for one here). */
export async function setVisitorCheckinOpen(meetingId: string, open: boolean) {
  const meeting = await getMeetingOrThrow(meetingId);
  const session = await requireAdminSession();
  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  await db.meeting.update({ where: { id: meetingId }, data: { visitorCheckInOpen: open } });
  await logActivity({
    userId: session.user.id,
    action: open ? "visitor_attendance.registration_opened" : "visitor_attendance.registration_closed",
    entity: "Meeting",
    entityId: meetingId,
  });

  revalidatePath(`/admin/visitors-qr/${meetingId}`);
}
