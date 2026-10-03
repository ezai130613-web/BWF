import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmailBatch } from "@/lib/email";
import { formatIst, formatIstDateTime } from "@/lib/ist";
import { getBooleanSetting } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";
import { logActivity } from "@/lib/audit";

/**
 * Visitor feedback email notification (2026-10-03) — strictly additive to
 * storage: the Feedback row is already saved before this runs (from
 * `after()` in the submit action), and nothing here can throw back into
 * the visitor's submission.
 *
 * Default recipient is every ACTIVE Super Admin's configured login email —
 * read from the accounts, never hardcoded (that is Abiramanathan's account
 * today). Extra addresses come from FeedbackEmailRecipient, each
 * individually switchable in Admin → Settings.
 */

const emailSchema = z.email();

export async function getDefaultFeedbackRecipients() {
  const admins = await db.user.findMany({
    where: { status: "ACTIVE", email: { not: null }, roles: { some: { role: { key: "SUPER_ADMIN" } } } },
    select: { name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  return admins.filter((a): a is { name: string; email: string } => Boolean(a.email));
}

export async function getActiveFeedbackRecipientEmails(): Promise<string[]> {
  const [notifyDefault, defaults, extras] = await Promise.all([
    getBooleanSetting("feedback.notifySuperAdmins"),
    getDefaultFeedbackRecipients(),
    db.feedbackEmailRecipient.findMany({ where: { isEnabled: true }, select: { email: true } }),
  ]);
  const all = [...(notifyDefault ? defaults.map((d) => d.email) : []), ...extras.map((e) => e.email)]
    .map((e) => e.trim().toLowerCase())
    .filter((e) => emailSchema.safeParse(e).success);
  return [...new Set(all)];
}

const TYPE_LABEL: Record<string, string> = {
  MEETING: "Meeting",
  EVENT: "Event",
  MANAGEMENT: "Management",
  GENERAL: "General",
};

export async function notifyFeedbackSubmitted(feedbackId: string) {
  try {
    const feedback = await db.feedback.findUnique({
      where: { id: feedbackId },
      include: { chapter: true, meeting: true, invitedByMember: { select: { name: true } } },
    });
    if (!feedback) return;

    const recipients = await getActiveFeedbackRecipientEmails();
    if (recipients.length === 0) return;

    const meetingLine = feedback.meeting
      ? `${feedback.meeting.title} — ${formatIst(feedback.meeting.startsAt, { day: "numeric", month: "short", year: "numeric" })}`
      : null;
    const rows: [string, string | null | undefined][] = [
      ["Type", TYPE_LABEL[feedback.type] ?? feedback.type],
      ["Visitor name", feedback.name ?? "Anonymous"],
      ["Company", feedback.company],
      ["Phone", feedback.phone],
      ["Email", feedback.email],
      ["Chapter", feedback.chapter?.name],
      ["Meeting", meetingLine],
      ["Invited by", feedback.invitedByMember?.name],
      ["Rating", feedback.rating ? `${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)} (${feedback.rating}/5)` : null],
      ["Submitted", `${formatIstDateTime(feedback.createdAt)} IST`],
    ];

    const text = [
      "New visitor feedback was submitted on the BWF website.",
      "",
      ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      "",
      "Feedback:",
      feedback.message,
      "",
      `View in the Admin Panel (sign-in required): ${SITE_URL}/admin/feedback?id=${feedback.id}#feedback-${feedback.id}`,
    ].join("\n");

    const subject = `New ${TYPE_LABEL[feedback.type]?.toLowerCase() ?? ""} feedback${feedback.name ? ` from ${feedback.name}` : ""}${
      feedback.chapter ? ` · ${feedback.chapter.name}` : ""
    }`;

    const results = await sendEmailBatch(recipients.map((to) => ({ to, subject, text })));
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) {
      await logActivity({
        action: "feedback.notification_failed",
        entity: "Feedback",
        entityId: feedback.id,
        metadata: { failed, total: results.length },
      });
    }
  } catch (err) {
    // Never surface to the visitor — their feedback is already stored.
    console.error("[feedback] notification failed", feedbackId, err);
  }
}
