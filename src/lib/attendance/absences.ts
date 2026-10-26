import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { formatIst } from "@/lib/ist";
import { SITE_URL } from "@/lib/site";
import { closeMeetingAttendance } from "@/lib/attendance/manage";
import { isWhatsAppEnabled, normalizeWhatsAppNumber, sendWhatsAppTemplate } from "@/lib/whatsapp";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Phase 39 (2026-10-26, client request) — consecutive absences.
 *
 * 1. Auto-absent: once a meeting is over, members who didn't check in with
 *    the QR code are marked ABSENT (closeMeetingAttendance — the same thing
 *    an admin's "Close attendance" button does). Runs from the hourly cron
 *    at the meeting's check-in close time, or AUTO_CLOSE_AFTER_MS after it
 *    starts. Safety rule: a meeting with no check-ins at all is never
 *    auto-closed (the QR may simply not have been used) — it's listed for
 *    an admin to close by hand instead.
 * 2. 2 absences in a row → automatic warning email + WhatsApp to the member
 *    (once per streak — keyed on the meeting that made it 2).
 * 3. 3 or more in a row → an OPEN AbsenceReview for the admins (and an email
 *    alert). An admin either extends courtesy (e.g. medical approval —
 *    absences up to a chosen date stop counting) or removes the member
 *    (deactivated everywhere; payment/attendance records are kept and an
 *    admin can restore them later).
 *
 * "In a row" counts only the member's own chapter's meetings whose
 * attendance is closed, not CANCELLED, held after the member joined and
 * after the tracking start date (Settings). A PRESENT meeting ends the
 * streak; a meeting with no attendance row for the member (not expected
 * then) is skipped. Everything is recomputed from attendance each time, so
 * an attendance correction automatically shortens a streak — an OPEN review
 * whose streak drops below 3 is dismissed automatically.
 */

export const WARNING_STREAK = 2;
export const REVIEW_STREAK = 3;
/** Without a check-in close time, attendance auto-closes this long after the meeting starts. */
export const AUTO_CLOSE_AFTER_MS = 6 * 60 * 60 * 1000;

const TRACKING_KEY = "attendance.absenceTrackingFrom";

/** When absence tracking started counting meetings, or null if an admin has switched it off. */
export async function getAbsenceTrackingFrom(): Promise<Date | null> {
  const row = await db.appSetting.findUnique({ where: { key: TRACKING_KEY } });
  if (typeof row?.value !== "string") return null;
  const date = new Date(row.value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `null` switches tracking off; a date (re)starts the count from then. */
export async function setAbsenceTrackingFrom(value: Date | null) {
  if (value) {
    const json = value.toISOString();
    await db.appSetting.upsert({ where: { key: TRACKING_KEY }, create: { key: TRACKING_KEY, value: json }, update: { value: json } });
  } else {
    await db.appSetting.upsert({ where: { key: TRACKING_KEY }, create: { key: TRACKING_KEY, value: false }, update: { value: false } });
  }
}

function autoCloseAt(meeting: { startsAt: Date; checkInClosesAt: Date | null }) {
  return meeting.checkInClosesAt ?? new Date(meeting.startsAt.getTime() + AUTO_CLOSE_AFTER_MS);
}

/** Meetings past their close time whose attendance is still open — split into the ones we can close and the ones that need an admin. */
async function findMeetingsToClose(trackingFrom: Date, now: Date) {
  const candidates = await db.meeting.findMany({
    where: {
      attendanceClosedAt: null,
      status: { not: "CANCELLED" },
      startsAt: { gte: trackingFrom, lte: now },
    },
    select: {
      id: true,
      title: true,
      chapterId: true,
      startsAt: true,
      checkInClosesAt: true,
      chapter: { select: { name: true } },
      _count: { select: { attendances: { where: { status: "PRESENT" } } } },
    },
    orderBy: { startsAt: "asc" },
  });
  const due = candidates.filter((m) => autoCloseAt(m) <= now);
  return {
    closable: due.filter((m) => m._count.attendances > 0),
    noCheckIns: due.filter((m) => m._count.attendances === 0),
  };
}

/** For the admin review page: meetings that ended with zero check-ins, left open on purpose. */
export async function getMeetingsAwaitingManualClose(chapterId?: string) {
  const trackingFrom = await getAbsenceTrackingFrom();
  if (!trackingFrom) return [];
  const { noCheckIns } = await findMeetingsToClose(trackingFrom, new Date());
  return noCheckIns.filter((m) => !chapterId || m.chapterId === chapterId);
}

export type AbsenceStreak = {
  memberId: string;
  /** Consecutive absences, newest first. */
  meetings: { id: string; title: string; startsAt: Date }[];
};

/**
 * Current consecutive-absence streak for each ACTIVE member of a chapter.
 * Members with no current absence are left out.
 */
export async function getChapterAbsenceStreaks(chapterId: string, trackingFrom: Date): Promise<AbsenceStreak[]> {
  const [members, meetings, courtesies] = await Promise.all([
    db.member.findMany({ where: { chapterId, status: "ACTIVE" }, select: { id: true, joinedAt: true } }),
    db.meeting.findMany({
      where: { chapterId, attendanceClosedAt: { not: null }, status: { not: "CANCELLED" }, startsAt: { gte: trackingFrom } },
      select: { id: true, title: true, startsAt: true, attendances: { select: { memberId: true, status: true } } },
      orderBy: { startsAt: "desc" },
    }),
    db.absenceReview.groupBy({
      by: ["memberId"],
      where: { status: "COURTESY_GRANTED", member: { chapterId } },
      _max: { excusedUntil: true },
    }),
  ]);
  const excusedUntil = new Map(courtesies.map((c) => [c.memberId, c._max.excusedUntil]));

  const streaks: AbsenceStreak[] = [];
  for (const member of members) {
    const excused = excusedUntil.get(member.id);
    const streak: AbsenceStreak["meetings"] = [];
    for (const meeting of meetings) {
      if (meeting.startsAt < member.joinedAt) break;
      if (excused && meeting.startsAt <= excused) break;
      const record = meeting.attendances.find((a) => a.memberId === member.id);
      if (!record) continue;
      if (record.status === "PRESENT") break;
      streak.push({ id: meeting.id, title: meeting.title, startsAt: meeting.startsAt });
    }
    if (streak.length > 0) streaks.push({ memberId: member.id, meetings: streak });
  }
  return streaks;
}

function shortDate(date: Date) {
  return formatIst(date, { day: "numeric", month: "short" });
}

/** Member's email for warnings — same preference as meeting reminders: verified login email, else contact email. */
function memberEmail(member: { email: string | null; user: { email: string | null; status: string } | null }) {
  const email = (member.user?.status === "ACTIVE" && member.user.email ? member.user.email : member.email)?.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** Sends the 2-in-a-row warning once. The AbsenceWarning row is written first, so a second run can't send it again. */
async function sendAbsenceWarning(memberId: string, streak: AbsenceStreak) {
  const latest = streak.meetings[0];
  try {
    await db.absenceWarning.create({
      data: { memberId, meetingId: latest.id, streak: streak.meetings.length, emailStatus: "PENDING", whatsappStatus: "PENDING" },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return false;
    throw error;
  }

  const member = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { name: true, email: true, whatsapp: true, phone: true, chapter: { select: { name: true } }, user: { select: { email: true, status: true } } },
  });
  const dates = [...streak.meetings].reverse().map((m) => shortDate(m.startsAt)).join(" and ");
  const firstName = member.name.split(" ")[0];

  let emailStatus = "SKIPPED";
  let emailError: string | null = "No valid email address";
  const email = memberEmail(member);
  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: `BWF attendance: ${streak.meetings.length} meetings missed in a row`,
        text: [
          `Hello ${firstName},`,
          "",
          `Our records show you were absent from the last ${streak.meetings.length} ${member.chapter.name} meetings (${dates}) — you didn't check in with the meeting QR code.`,
          "",
          "Regular attendance is part of BWF membership. If you miss the next meeting as well, your membership will be referred to the BWF admin team for review.",
          "",
          "If there is a reason — for example a medical issue — please let your chapter know so it can be taken into account.",
          "If you did attend and forgot to scan the QR code, please ask your chapter admin to correct your attendance.",
          "",
          `Member portal: ${SITE_URL}/member`,
          "",
          "— Builders World Forum",
        ].join("\n"),
      });
      emailStatus = "SENT";
      emailError = null;
    } catch (err) {
      emailStatus = "FAILED";
      emailError = (err instanceof Error ? err.message : "Send failed").slice(0, 300);
    }
  }

  let whatsappStatus = "SKIPPED";
  let whatsappError: string | null = isWhatsAppEnabled() ? "No valid WhatsApp number" : "WhatsApp not configured";
  const phone = normalizeWhatsAppNumber(member.whatsapp) ?? normalizeWhatsAppNumber(member.phone);
  if (phone && isWhatsAppEnabled()) {
    const result = await sendWhatsAppTemplate({
      to: phone,
      template: "absenceWarning",
      params: [firstName, String(streak.meetings.length), member.chapter.name, dates],
    });
    whatsappStatus = result.ok ? "SENT" : "FAILED";
    whatsappError = result.ok ? null : result.error;
  }

  await db.absenceWarning.update({
    where: { memberId_meetingId: { memberId, meetingId: latest.id } },
    data: { emailStatus, emailError, whatsappStatus, whatsappError },
  });
  await logActivity({
    action: "attendance.absence_warning_sent",
    entity: "Member",
    entityId: memberId,
    metadata: { streak: streak.meetings.length, meetingId: latest.id, emailStatus, whatsappStatus },
  });
  return true;
}

/** Alert for a new 3-in-a-row review: the business inbox plus the chapter's own Chapter Admins. */
async function notifyAdminsOfReview(memberId: string, streak: AbsenceStreak) {
  const member = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { name: true, chapterId: true, chapter: { select: { name: true } } },
  });
  const chapterAdmins = await db.user.findMany({
    where: { status: "ACTIVE", email: { not: null }, roles: { some: { chapterId: member.chapterId, role: { key: "CHAPTER_ADMIN" } } } },
    select: { email: true },
  });
  const to = [...new Set([process.env.NOTIFICATION_EMAIL, ...chapterAdmins.map((u) => u.email)].filter((e): e is string => Boolean(e)))];
  const dates = [...streak.meetings].reverse().map((m) => shortDate(m.startsAt)).join(", ");
  const warned = (await db.absenceWarning.count({ where: { memberId, meetingId: { in: streak.meetings.map((m) => m.id) } } })) > 0;

  for (const address of to) {
    try {
      await sendEmail({
        to: address,
        subject: `Attendance review needed: ${member.name} (${streak.meetings.length} meetings missed)`,
        text: [
          `${member.name} (${member.chapter.name}) has been absent from ${streak.meetings.length} meetings in a row: ${dates}.`,
          "",
          warned
            ? "They were sent an automatic warning after the second absence. Please decide whether to extend courtesy (for example on medical grounds) or remove the member:"
            : "Please decide whether to extend courtesy (for example on medical grounds) or remove the member:",
          `${SITE_URL}/admin/attendance/reviews`,
          "",
          "— BWF website",
        ].join("\n"),
      });
    } catch (err) {
      console.error("[absences] review alert failed for", address, err);
    }
  }
}

export type AbsenceRunSummary = {
  closedMeetings: string[];
  meetingsWithoutCheckIns: string[];
  warningsSent: number;
  reviewsOpened: number;
  reviewsDismissed: number;
};

/** Re-evaluates one chapter's streaks: sends due warnings, opens/updates/dismisses reviews. */
export async function evaluateChapterAbsences(chapterId: string, summary?: AbsenceRunSummary) {
  const trackingFrom = await getAbsenceTrackingFrom();
  if (!trackingFrom) return;

  const streaks = await getChapterAbsenceStreaks(chapterId, trackingFrom);
  const byMember = new Map(streaks.map((s) => [s.memberId, s]));

  // Dismiss OPEN reviews that no longer apply (correction, or member no longer ACTIVE here).
  const openReviews = await db.absenceReview.findMany({ where: { status: "OPEN", member: { chapterId } }, select: { id: true, memberId: true } });
  for (const review of openReviews) {
    const streak = byMember.get(review.memberId);
    if (!streak || streak.meetings.length < REVIEW_STREAK) {
      await db.absenceReview.update({
        where: { id: review.id },
        data: { status: "DISMISSED", decidedAt: new Date(), decisionNote: "Closed automatically — no longer 3 absences in a row (attendance corrected or member not active)." },
      });
      if (summary) summary.reviewsDismissed++;
    }
  }

  for (const streak of streaks) {
    const count = streak.meetings.length;
    if (count === WARNING_STREAK) {
      if ((await sendAbsenceWarning(streak.memberId, streak)) && summary) summary.warningsSent++;
    } else if (count >= REVIEW_STREAK) {
      const data: Prisma.AbsenceReviewUncheckedUpdateInput = {
        streak: count,
        absentMeetingIds: streak.meetings.map((m) => m.id),
        lastAbsentMeetingAt: streak.meetings[0].startsAt,
      };
      const open = await db.absenceReview.findFirst({ where: { memberId: streak.memberId, status: "OPEN" }, select: { id: true } });
      if (open) {
        await db.absenceReview.update({ where: { id: open.id }, data });
      } else {
        const created = await db.absenceReview.create({
          data: {
            memberId: streak.memberId,
            streak: count,
            absentMeetingIds: streak.meetings.map((m) => m.id),
            lastAbsentMeetingAt: streak.meetings[0].startsAt,
          },
        });
        await logActivity({ action: "attendance.absence_review_opened", entity: "AbsenceReview", entityId: created.id, metadata: { memberId: streak.memberId, streak: count } });
        await notifyAdminsOfReview(streak.memberId, streak);
        if (summary) summary.reviewsOpened++;
      }
    }
  }
}

/** The hourly job: auto-close finished meetings, then re-evaluate every chapter with tracked meetings. */
export async function processAbsences(now = new Date()): Promise<AbsenceRunSummary> {
  const summary: AbsenceRunSummary = { closedMeetings: [], meetingsWithoutCheckIns: [], warningsSent: 0, reviewsOpened: 0, reviewsDismissed: 0 };
  const trackingFrom = await getAbsenceTrackingFrom();
  if (!trackingFrom) return summary;

  const { closable, noCheckIns } = await findMeetingsToClose(trackingFrom, now);
  for (const meeting of closable) {
    await closeMeetingAttendance(meeting.id, null);
    summary.closedMeetings.push(meeting.id);
  }
  summary.meetingsWithoutCheckIns = noCheckIns.map((m) => m.id);

  const chapters = await db.meeting.findMany({
    where: { attendanceClosedAt: { not: null }, startsAt: { gte: trackingFrom } },
    select: { chapterId: true },
    distinct: ["chapterId"],
  });
  for (const { chapterId } of chapters) {
    await evaluateChapterAbsences(chapterId, summary);
  }
  return summary;
}

/**
 * Removes a member (admin decision): INACTIVE (frees the category slot,
 * hides them from the website, app pickers, rosters and reminders), login
 * suspended and signed out of every device. Payments, attendance and
 * activity records stay; an admin can restore the member from Members.
 */
export async function deactivateMember(memberId: string) {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId }, select: { userId: true } });
  await db.$transaction([
    db.member.update({ where: { id: memberId }, data: { status: "INACTIVE", activeSlotKey: null } }),
    ...(member.userId
      ? [
          db.user.update({ where: { id: member.userId }, data: { status: "SUSPENDED", sessionVersion: { increment: 1 } } }),
          db.mobileSession.updateMany({ where: { userId: member.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]
      : []),
  ]);
}

export type AbsenceDecision =
  | { kind: "courtesy"; note: string; excusedUntil: Date }
  | { kind: "remove"; note: string };

/** An admin's decision on an OPEN review. Caller checks permissions. */
export async function decideAbsenceReview(reviewId: string, decidedByUserId: string, decision: AbsenceDecision) {
  const review = await db.absenceReview.findUniqueOrThrow({ where: { id: reviewId } });
  if (review.status !== "OPEN") throw new Error("This review has already been decided.");

  if (decision.kind === "courtesy") {
    await db.absenceReview.update({
      where: { id: reviewId },
      data: {
        status: "COURTESY_GRANTED",
        decidedAt: new Date(),
        decidedByUserId,
        decisionNote: decision.note,
        excusedUntil: decision.excusedUntil,
      },
    });
  } else {
    await deactivateMember(review.memberId);
    await db.absenceReview.update({
      where: { id: reviewId },
      data: { status: "MEMBER_REMOVED", decidedAt: new Date(), decidedByUserId, decisionNote: decision.note },
    });
  }

  await logActivity({
    userId: decidedByUserId,
    action: decision.kind === "courtesy" ? "attendance.absence_courtesy_granted" : "member.removed_for_absence",
    entity: "Member",
    entityId: review.memberId,
    metadata: {
      reviewId,
      streak: review.streak,
      note: decision.note,
      ...(decision.kind === "courtesy" ? { excusedUntil: decision.excusedUntil.toISOString() } : {}),
    },
  });
  return review.memberId;
}
