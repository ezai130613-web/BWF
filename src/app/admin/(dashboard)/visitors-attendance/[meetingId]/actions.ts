"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import type { AttendanceStatus } from "@/generated/prisma/client";

/** Spec: "Allow authorised manual corrections with administrator identity, timestamp, old/new status, and reason." */
export async function correctVisitorAttendance(
  visitorAttendanceId: string,
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const statusRaw = formData.get("status");
  const reason = formData.get("reason");

  if (statusRaw !== "PRESENT" && statusRaw !== "ABSENT") return { error: "Select a status.", success: false };
  if (typeof reason !== "string" || !reason.trim()) return { error: "A reason is required to correct attendance.", success: false };

  const status: AttendanceStatus = statusRaw;

  const existing = await db.visitorAttendance.findUnique({ where: { id: visitorAttendanceId } });
  if (!existing) return { error: "Visitor attendance record not found.", success: false };

  const session = await requireAdminSession();
  await requireChapterAccess(existing.chapterId, "attendance:manage");

  await db.visitorAttendance.update({
    where: { id: visitorAttendanceId },
    data: {
      status,
      correctedByUserId: session.user.id,
      correctionReason: reason.trim(),
      correctedAt: new Date(),
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "visitor_attendance.corrected",
    entity: "VisitorAttendance",
    entityId: visitorAttendanceId,
    metadata: { from: existing.status, to: status, reason: reason.trim() },
  });

  revalidatePath(`/admin/visitors-attendance/${existing.meetingId}`);
  return { error: undefined, success: true };
}
