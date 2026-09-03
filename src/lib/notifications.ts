import { sendEmail } from "@/lib/email";

/**
 * Phase 13 (brief §49) — one function per business-workflow email trigger,
 * centralized here rather than inlined at each action-file call site, so
 * "who gets emailed when" is auditable in one place. Password-reset emails
 * are the one exception — they stay in src/lib/auth/password-reset.ts,
 * mirroring how the existing login-OTP email already lives inline in
 * src/lib/auth/otp-login.ts rather than here (auth-specific, tightly
 * coupled to OTP code generation, not a general business notification).
 *
 * "Business email" (brief's own phrase, "do not hardcode business email")
 * is NOTIFICATION_EMAIL — a plain env var, not a database-configured list
 * (WeeklyReportRecipient is specifically for the report attachment, a
 * different concern). Admin-facing alerts below are skipped silently (no
 * email attempt) when it's unset — same no-dead-feature rule as
 * NEXT_PUBLIC_WHATSAPP_NUMBER.
 */

function adminNotificationAddress(): string | undefined {
  return process.env.NOTIFICATION_EMAIL || undefined;
}

export async function notifyVisitorRegistered(input: {
  visitorName: string;
  visitorEmail: string;
  chapterName: string;
  kind: "meeting" | "event";
  title: string;
  startsAt: Date;
  venue: string | null;
}) {
  const when = input.startsAt.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });
  const label = input.kind === "event" ? "event" : "meeting";

  await sendEmail({
    to: input.visitorEmail,
    subject: `You're registered — ${input.title}`,
    text: `Hi ${input.visitorName},

You're registered for the ${input.title} ${label} with Builders World Forum, ${input.chapterName}.

When: ${when}${input.venue ? `\nWhere: ${input.venue}` : ""}

We look forward to seeing you there.

— Builders World Forum`,
  });
}

export async function notifyApplicationSubmitted(input: {
  applicantName: string;
  applicantEmail: string;
  companyName: string;
  categoryName: string;
  waitlisted: boolean;
}) {
  await sendEmail({
    to: input.applicantEmail,
    subject: "We've received your Builders World Forum application",
    text: `Hi ${input.applicantName},

Thank you for applying to join Builders World Forum as our ${input.categoryName} representative for ${input.companyName}.
${input.waitlisted ? "\nEvery chapter currently has this category filled, so your application has been added to our waiting list — we'll be in touch as soon as a slot opens." : "\nOur team will review your application and be in touch shortly."}

— Builders World Forum`,
  });

  const notifyAddress = adminNotificationAddress();
  if (!notifyAddress) return;

  await sendEmail({
    to: notifyAddress,
    subject: `New membership application — ${input.applicantName}`,
    text: `${input.applicantName} (${input.companyName}) applied for ${input.categoryName}${input.waitlisted ? " — waitlisted, no chapter slot available" : ""}.

Review it at /admin/applications.`,
  });
}

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  NEW: "received",
  UNDER_REVIEW: "under review",
  CONTACTED: "contacted",
  MEETING_SCHEDULED: "meeting scheduled",
  APPROVED_IN_PRINCIPLE: "approved in principle",
  WAITING_FOR_PAYMENT: "approved — awaiting payment",
  PAID: "approved",
  REJECTED: "not approved at this time",
  WAITLISTED: "on our waiting list",
};

export async function notifyApplicationStatusChanged(input: {
  applicantName: string;
  applicantEmail: string;
  status: string;
}) {
  const label = APPLICATION_STATUS_LABELS[input.status] ?? input.status;

  await sendEmail({
    to: input.applicantEmail,
    subject: "Update on your Builders World Forum application",
    text: `Hi ${input.applicantName},

Your membership application status has been updated: ${label}.

— Builders World Forum`,
  });
}

export async function notifyProfileRevisionReviewed(input: {
  memberName: string;
  memberEmail: string;
  approved: boolean;
  reviewNotes?: string;
}) {
  await sendEmail({
    to: input.memberEmail,
    subject: input.approved ? "Your profile update was approved" : "Your profile update was not approved",
    text: `Hi ${input.memberName},

Your requested profile update has been ${input.approved ? "approved and is now live on your public profile" : "reviewed and was not approved"}.${
      input.reviewNotes ? `\n\nNote from BWF: ${input.reviewNotes}` : ""
    }

— Builders World Forum`,
  });
}

export async function notifyChatbotLeadCaptured(input: {
  name: string;
  phone: string;
  email?: string;
  requirement: string;
}) {
  const notifyAddress = adminNotificationAddress();
  if (!notifyAddress) return;

  await sendEmail({
    to: notifyAddress,
    subject: `New Ask BWF lead — ${input.name}`,
    text: `${input.name} asked Ask BWF to connect them with BWF.

Phone: ${input.phone}${input.email ? `\nEmail: ${input.email}` : ""}
Requirement: ${input.requirement}

Follow up at /admin/chatbot.`,
  });
}
