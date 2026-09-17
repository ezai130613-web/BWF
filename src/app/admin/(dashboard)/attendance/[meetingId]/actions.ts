"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { closeMeetingAttendance } from "@/lib/attendance/manage";
import type { AttendanceStatus } from "@/generated/prisma/client";

async function getMeetingOrThrow(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

/** Spec: "Authorised admins may correct attendance with a mandatory reason and audit log recording who changed what and when." */
export async function correctAttendance(
  meetingId: string,
  memberId: string,
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const statusRaw = formData.get("status");
  const reason = formData.get("reason");

  if (statusRaw !== "PRESENT" && statusRaw !== "ABSENT") return { error: "Select a status.", success: false };
  if (typeof reason !== "string" || !reason.trim()) return { error: "A reason is required to correct attendance.", success: false };

  const status: AttendanceStatus = statusRaw;

  const meeting = await getMeetingOrThrow(meetingId);
  const session = await requireAdminSession();
  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  const existing = await db.attendance.findUnique({ where: { meetingId_memberId: { meetingId, memberId } } });

  const data = {
    status,
    correctedByUserId: session.user.id,
    correctionReason: reason.trim(),
    correctedAt: new Date(),
  };

  await db.attendance.upsert({
    where: { meetingId_memberId: { meetingId, memberId } },
    create: { meetingId, memberId, ...data },
    update: data,
  });

  await logActivity({
    userId: session.user.id,
    action: "attendance.corrected",
    entity: "Attendance",
    entityId: `${meetingId}:${memberId}`,
    metadata: { from: existing?.status ?? "NOT_CHECKED_IN", to: status, reason: reason.trim() },
  });

  revalidatePath(`/admin/attendance/${meetingId}`);
  return { error: undefined, success: true };
}

/** Spec: "after closure, mark expected members without check-in Absent." */
export async function closeAttendance(meetingId: string) {
  const meeting = await getMeetingOrThrow(meetingId);
  const session = await requireAdminSession();
  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  await closeMeetingAttendance(meetingId, session.user.id);
  revalidatePath(`/admin/attendance/${meetingId}`);
}
