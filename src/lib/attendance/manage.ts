import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

/** One entry of Payment.monthsCovered — validated at the point of writing, same tradeoff as Blog.faq. */
export type MonthYear = { month: number; year: number };

export function parseMonthsCovered(value: Prisma.JsonValue): MonthYear[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is MonthYear =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as MonthYear).month === "number" &&
      typeof (v as MonthYear).year === "number",
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function formatMonthYear({ month, year }: MonthYear): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export function formatMonthsCovered(value: Prisma.JsonValue): string {
  return parseMonthsCovered(value)
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map(formatMonthYear)
    .join(", ");
}

/**
 * Spec: "Flag overlap with already approved month coverage for review; do
 * not automatically reject legitimate adjustments." Only APPROVED payments
 * count as real coverage — a still-pending or rejected submission was never
 * confirmed money, so it can't be "overlapped" in any meaningful sense.
 */
export async function hasApprovedOverlap(memberId: string, monthsCovered: MonthYear[]): Promise<boolean> {
  const approved = await db.payment.findMany({
    where: { memberId, type: "MEETING", status: "APPROVED" },
    select: { monthsCovered: true },
  });

  const claimed = new Set(monthsCovered.map((m) => `${m.year}-${m.month}`));
  return approved.some((p) => parseMonthsCovered(p.monthsCovered).some((m) => claimed.has(`${m.year}-${m.month}`)));
}

/**
 * Spec: "Show Not Checked In during an active meeting; after closure, mark
 * expected members without check-in Absent." Rather than computing this
 * lazily at read time (the Blog scheduled-visibility pattern), Absent rows
 * are materialized here as real Attendance records — the spec's own
 * correction/audit-trail requirement ("Authorised admins may correct
 * attendance... enforce one attendance record per member per meeting") only
 * makes sense against a real row to correct, not a computed placeholder.
 * "Expected members" = the chapter's own ACTIVE members; a member who joined
 * or left the chapter around this meeting's date is handled by
 * getExpectedMemberIds itself never including anyone outside their current
 * chapter — see its own comment for the one known gap this leaves.
 */
export async function closeMeetingAttendance(meetingId: string, closedByUserId: string | null) {
  const meeting = await db.meeting.findUniqueOrThrow({ where: { id: meetingId } });

  const [expectedMembers, existing] = await Promise.all([
    // Phase 39 — members who joined after the meeting weren't expected at it.
    db.member.findMany({ where: { chapterId: meeting.chapterId, status: "ACTIVE", joinedAt: { lte: meeting.startsAt } }, select: { id: true } }),
    db.attendance.findMany({ where: { meetingId }, select: { memberId: true } }),
  ]);

  const alreadyRecorded = new Set(existing.map((a) => a.memberId));
  const absentMemberIds = expectedMembers.map((m) => m.id).filter((id) => !alreadyRecorded.has(id));

  if (absentMemberIds.length > 0) {
    await db.attendance.createMany({
      data: absentMemberIds.map((memberId) => ({ meetingId, memberId, status: "ABSENT" as const })),
      skipDuplicates: true,
    });
  }

  // Closing attendance is independent of Meeting.status (already a
  // separately admin-editable field on /admin/meetings/[id], and load-
  // bearing for visitor-registration closure) — this only stops new
  // check-ins and backfills Absent rows, it doesn't declare the meeting over.
  // Phase 39 — attendanceClosedAt marks the meeting as counting towards
  // absence warnings (src/lib/attendance/absences.ts). Re-closing keeps the
  // first close time.
  await db.meeting.update({
    where: { id: meetingId },
    data: { attendanceRegistrationOpen: false, attendanceClosedAt: meeting.attendanceClosedAt ?? new Date() },
  });

  await logActivity({
    userId: closedByUserId,
    action: "attendance.meeting_closed",
    entity: "Meeting",
    entityId: meetingId,
    metadata: { markedAbsent: absentMemberIds.length, automatic: closedByUserId === null },
  });
}
