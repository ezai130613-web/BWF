import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { formatIst } from "@/lib/ist";
import { SITE_URL } from "@/lib/site";
import type { MeetingReminderStatus } from "@/generated/prisma/client";

/**
 * Automatic member meeting reminders (2026-10-03). Every meeting with
 * `reminderEnabled` gets one email to each ACTIVE member of its own chapter
 * who has a valid email, 2 days (48h) before it starts. Driven by an hourly
 * cron (/api/cron/meeting-reminders) — the meeting row is re-read at send
 * time, so venue/date/Chief Guest edits made beforehand are always what
 * goes out.
 *
 * Exactly-once: a run claims a meeting by flipping reminderStatus
 * null → SENDING in one conditional update, so overlapping runs can't both
 * send it. A run that dies mid-send leaves SENDING behind; after
 * STALE_CLAIM_MS another run picks it up and sends only to recipients with
 * no SENT log row yet.
 */

export const REMINDER_LEAD_MS = 48 * 60 * 60 * 1000;
const STALE_CLAIM_MS = 15 * 60 * 1000;

export function reminderScheduledFor(startsAt: Date): Date {
  return new Date(startsAt.getTime() - REMINDER_LEAD_MS);
}

const emailSchema = z.email();

export type ReminderRecipient = { memberId: string; name: string; email: string };

/** The chapter's ACTIVE members with a usable address — the portal login's
 * email first (verified at activation), else the member's contact email.
 * Members without either are skipped; they qualify automatically once one
 * is added. */
export async function getReminderRecipients(chapterId: string): Promise<ReminderRecipient[]> {
  const members = await db.member.findMany({
    where: { chapterId, status: "ACTIVE" },
    select: { id: true, name: true, email: true, user: { select: { email: true, status: true } } },
    orderBy: { name: "asc" },
  });
  const seen = new Set<string>();
  const recipients: ReminderRecipient[] = [];
  for (const m of members) {
    const candidate = (m.user?.status === "ACTIVE" && m.user.email ? m.user.email : m.email)?.trim().toLowerCase();
    if (!candidate || !emailSchema.safeParse(candidate).success || seen.has(candidate)) continue;
    seen.add(candidate);
    recipients.push({ memberId: m.id, name: m.name, email: candidate });
  }
  return recipients;
}

type MeetingForEmail = {
  title: string;
  startsAt: Date;
  venue: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  agenda: string | null;
  description: string | null;
  chapter: { name: string; slug: string };
  chiefGuest: { name: string; designation: string | null; company: string | null } | null;
};

export function buildReminderEmail(meeting: MeetingForEmail, recipientName: string) {
  const date = formatIst(meeting.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = formatIst(meeting.startsAt, { hour: "numeric", minute: "2-digit" });
  const chiefGuest = meeting.chiefGuest
    ? [meeting.chiefGuest.name, meeting.chiefGuest.designation, meeting.chiefGuest.company].filter(Boolean).join(", ")
    : null;

  const lines = [
    `Hello ${recipientName},`,
    "",
    `This is a reminder that your Builders World Forum ${meeting.chapter.name} meeting is in 2 days.`,
    "",
    `Meeting: ${meeting.title}`,
    `Date: ${date}`,
    `Time: ${time}`,
    `Venue: ${meeting.venue ?? "To be confirmed"}`,
    ...(meeting.address ? [`Address: ${meeting.address}`] : []),
    ...(meeting.googleMapsUrl ? [`Map: ${meeting.googleMapsUrl}`] : []),
    ...(chiefGuest ? [`Chief Guest: ${chiefGuest}`] : []),
    ...(meeting.agenda ? ["", `Agenda: ${meeting.agenda}`] : []),
    ...(meeting.description ? ["", meeting.description] : []),
    "",
    "Bring your referrals, thank you slips and one-to-one updates.",
    `Member portal: ${SITE_URL}/member`,
    "",
    "— Builders World Forum",
  ];

  return {
    subject: `Reminder: ${meeting.chapter.name} meeting on ${formatIst(meeting.startsAt, { weekday: "short", day: "numeric", month: "short" })}, ${time}`,
    text: lines.join("\n"),
  };
}

/** Sends one meeting's reminder. Assumes the caller already claimed it (status SENDING). */
async function sendMeetingReminder(meetingId: string): Promise<MeetingReminderStatus> {
  const meeting = await db.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: { chapter: true, chiefGuest: true },
  });

  const alreadySent = new Set(
    (await db.meetingReminderLog.findMany({ where: { meetingId, status: "SENT" }, select: { email: true } })).map((l) => l.email),
  );
  const allRecipients = await getReminderRecipients(meeting.chapterId);
  const recipients = allRecipients.filter((r) => !alreadySent.has(r.email));

  if (allRecipients.length === 0) {
    await db.meeting.update({ where: { id: meetingId }, data: { reminderStatus: "NO_RECIPIENTS", reminderProcessedAt: new Date() } });
    return "NO_RECIPIENTS";
  }

  const results = await sendEmailBatch(
    recipients.map((r) => ({ to: r.email, ...buildReminderEmail(meeting, r.name) })),
  );

  if (recipients.length > 0) {
    await db.meetingReminderLog.createMany({
      data: recipients.map((r, i) => {
        const result = results[i];
        return {
          meetingId,
          memberId: r.memberId,
          email: r.email,
          status: result.ok ? ("SENT" as const) : ("FAILED" as const),
          error: result.ok ? null : result.error,
        };
      }),
    });
  }

  const sentTotal = alreadySent.size + results.filter((r) => r.ok).length;
  const status: MeetingReminderStatus =
    sentTotal === 0 ? "FAILED" : sentTotal >= allRecipients.length ? "SENT" : "PARTIALLY_SENT";
  await db.meeting.update({ where: { id: meetingId }, data: { reminderStatus: status, reminderProcessedAt: new Date() } });
  return status;
}

export async function processDueMeetingReminders(now = new Date()) {
  const due = await db.meeting.findMany({
    where: {
      reminderEnabled: true,
      status: "SCHEDULED",
      startsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_LEAD_MS) },
      OR: [
        { reminderStatus: null },
        { reminderStatus: "SENDING", reminderProcessedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
      ],
    },
    select: { id: true, reminderStatus: true, reminderProcessedAt: true },
    orderBy: { startsAt: "asc" },
  });

  const processed: { meetingId: string; status: MeetingReminderStatus | "ERROR" }[] = [];
  for (const m of due) {
    const claim = await db.meeting.updateMany({
      where: { id: m.id, reminderStatus: m.reminderStatus, reminderProcessedAt: m.reminderProcessedAt },
      data: { reminderStatus: "SENDING", reminderProcessedAt: new Date() },
    });
    if (claim.count !== 1) continue;
    try {
      processed.push({ meetingId: m.id, status: await sendMeetingReminder(m.id) });
    } catch (err) {
      console.error("[meeting-reminders] failed for meeting", m.id, err);
      await db.meeting.update({ where: { id: m.id }, data: { reminderStatus: "FAILED", reminderProcessedAt: new Date() } });
      processed.push({ meetingId: m.id, status: "ERROR" });
    }
  }
  return processed;
}
