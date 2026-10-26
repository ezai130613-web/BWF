import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import {
  getMembershipTerms,
  MEMBERSHIP_TERMS_INTRO,
  MEMBERSHIP_TERMS_LAST_UPDATED,
  membershipTermsToHtml,
  membershipTermsToText,
} from "@/lib/legal/membership-terms";

/**
 * Phase 13 (brief §49) — one function per business-workflow email trigger,
 * centralized here rather than inlined at each action-file call site, so
 * "who gets emailed when" is auditable in one place. Password-reset emails
 * are the one exception — they stay in src/lib/auth/password-reset.ts
 * (auth-specific, tightly coupled to OTP code generation, not a general
 * business notification).
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

/**
 * Sender for mail that speaks for the membership office (2026-10-26 client
 * request: the T&C email to applicants comes "from an authorised mail id").
 * Sending from info@ works without a mailbox (the domain is verified with
 * Resend), but info@ has no inbox yet, so replies go to a real one:
 * MEMBERSHIP_EMAIL_REPLY_TO, else the business alert inbox
 * (NOTIFICATION_EMAIL), else the sender itself.
 */
function membershipFromAddress(): { from: string; replyTo: string } {
  const from = process.env.MEMBERSHIP_EMAIL_FROM || "Builders World Forum <info@buildersworldforum.com>";
  const replyTo =
    process.env.MEMBERSHIP_EMAIL_REPLY_TO || adminNotificationAddress() || (from.match(/<([^>]+)>/)?.[1] ?? from);
  return { from, replyTo };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function notifyVisitorRegistered(input: {
  visitorName: string;
  visitorEmail: string;
  chapterName: string;
  title: string;
  startsAt: Date;
  venue: string | null;
}) {
  const when = input.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });

  await sendEmail({
    to: input.visitorEmail,
    subject: `You're registered — ${input.title}`,
    text: `Hi ${input.visitorName},

You're registered for the ${input.title} meeting with Builders World Forum, ${input.chapterName}.

When: ${when}${input.venue ? `\nWhere: ${input.venue}` : ""}

We look forward to seeing you there.

— Builders World Forum`,
  });
}

/**
 * Sent the moment an application is submitted (2026-10-26): the
 * acknowledgement plus the full Membership Terms & Conditions the applicant
 * just accepted, from the membership mailbox (info@), so they have their own
 * copy on record. Same words as /membership-terms (shared data source).
 */
export async function notifyApplicationSubmitted(input: {
  applicantName: string;
  applicantEmail: string;
  companyName: string;
  categoryName: string;
  waitlisted: boolean;
  termsAcceptedAt: Date;
}) {
  const sections = await getMembershipTerms();
  const acceptedOn = input.termsAcceptedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" });
  const termsUrl = `${SITE_URL}/membership-terms`;
  const statusLine = input.waitlisted
    ? "Every chapter currently has this category filled, so your application has been added to our waiting list — we'll be in touch as soon as a slot opens."
    : "Our team will review your application and be in touch shortly.";
  const thanksLine = `Thank you for applying to join Builders World Forum as our ${input.categoryName} representative for ${input.companyName}.`;
  const acceptedLine = `You accepted the Membership Terms & Conditions below on ${acceptedOn} (IST). Please keep this email for your records.`;

  await sendEmail({
    ...membershipFromAddress(),
    to: input.applicantEmail,
    subject: "Your Builders World Forum application & Membership Terms and Conditions",
    text: `Hi ${input.applicantName},

${thanksLine}

${statusLine}

${acceptedLine}

MEMBERSHIP TERMS & CONDITIONS
Last updated: ${MEMBERSHIP_TERMS_LAST_UPDATED}

${MEMBERSHIP_TERMS_INTRO}

${membershipTermsToText(sections)}

Also available online: ${termsUrl}

If you have any questions, just reply to this email.

— Builders World Forum`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f2937;max-width:640px;">
<p>Hi ${escapeHtml(input.applicantName)},</p>
<p>${escapeHtml(thanksLine)}</p>
<p>${escapeHtml(statusLine)}</p>
<p style="padding:10px 12px;background:#f0fdf4;border-left:3px solid #166534;">${escapeHtml(acceptedLine)}</p>
<h2 style="margin:28px 0 2px;font-size:18px;color:#14532d;">Membership Terms &amp; Conditions</h2>
<p style="margin:0 0 12px;font-size:12px;color:#6b7280;">Last updated: ${escapeHtml(MEMBERSHIP_TERMS_LAST_UPDATED)}</p>
<p>${escapeHtml(MEMBERSHIP_TERMS_INTRO)}</p>
${membershipTermsToHtml(sections)}
<p style="margin-top:24px;">Also available online: <a href="${escapeHtml(termsUrl)}" style="color:#166534;">${escapeHtml(termsUrl)}</a></p>
<p>If you have any questions, just reply to this email.</p>
<p>— Builders World Forum</p>
</div>`,
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

/** Brief §31 — "Admin notified" the moment a member submits an article. */
export async function notifyArticleSubmitted(input: { memberName: string; title: string; blogId: string }) {
  const notifyAddress = adminNotificationAddress();
  if (!notifyAddress) return;

  await sendEmail({
    to: notifyAddress,
    subject: `New article submission — ${input.title}`,
    text: `${input.memberName} submitted an article for review: "${input.title}".

Review it at /admin/blogs/${input.blogId}.`,
  });
}

export async function notifyArticleReviewed(input: {
  memberName: string;
  memberEmail: string;
  title: string;
  approved: boolean;
  reviewNotes?: string;
}) {
  await sendEmail({
    to: input.memberEmail,
    subject: input.approved ? `Your article was approved — ${input.title}` : `Your article was not approved — ${input.title}`,
    text: `Hi ${input.memberName},

Your submitted article "${input.title}" has been ${input.approved ? "approved and published" : "reviewed and was not approved"}.${
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
