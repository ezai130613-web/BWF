"use server";

import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { notifyFeedbackSubmitted } from "@/lib/feedback/notify";

const TYPES = ["MEETING", "EVENT", "MANAGEMENT", "GENERAL"] as const;
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => v?.trim() || undefined);

const submitSchema = z.object({
  type: z.enum(TYPES),
  name: optionalText(200),
  email: z.email("Enter a valid email address").optional().or(z.literal("")),
  phone: optionalText(30),
  company: optionalText(200),
  rating: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 1 && v <= 5), "Rating must be 1–5"),
  message: z.string().trim().min(1, "Please share your feedback").max(5000),
  chapterId: optionalText(64),
  meetingId: optionalText(64),
  invitedByMemberId: optionalText(64),
});

/**
 * No permission check — this is the public submission endpoint, open to
 * anyone. Visibility is enforced on the read side instead: /admin/feedback
 * requires "feedback:view", which only Super Admin holds by default (brief
 * §34 — "Feedback must only be visible to Super Admin").
 *
 * 2026-10-03: the row is always saved first; the email to the configured
 * recipients runs afterwards via after(), so a mail failure can never fail
 * (or slow down) the visitor's submission.
 */
export async function submitFeedback(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const ip = await getClientIp();
  const allowed = await rateLimit(`feedback:${ip}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) return { error: TOO_MANY_REQUESTS_ERROR, success: false };

  const { chapterId, meetingId, invitedByMemberId, email, ...rest } = parsed.data;

  // Only keep links that genuinely belong together — a meeting must be in
  // the chosen chapter, an inviting member must be an active member.
  const [chapter, meeting, invitedBy] = await Promise.all([
    chapterId ? db.chapter.findFirst({ where: { id: chapterId, status: "ACTIVE" }, select: { id: true } }) : null,
    meetingId ? db.meeting.findUnique({ where: { id: meetingId }, select: { id: true, chapterId: true } }) : null,
    invitedByMemberId
      ? db.member.findFirst({ where: { id: invitedByMemberId, status: "ACTIVE" }, select: { id: true } })
      : null,
  ]);
  const meetingInChapter = meeting && chapter && meeting.chapterId === chapter.id ? meeting : null;

  const feedback = await db.feedback.create({
    data: {
      ...rest,
      email: email || undefined,
      chapterId: chapter?.id,
      meetingId: meetingInChapter?.id,
      invitedByMemberId: invitedBy?.id,
    },
  });

  after(() => notifyFeedbackSubmitted(feedback.id));

  return { error: undefined, success: true };
}
