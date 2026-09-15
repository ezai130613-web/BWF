"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifyVisitorRegistered } from "@/lib/notifications";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.email(),
  company: optionalText(),
  designation: optionalText(),
  categoryId: z.string().min(1, "Select a category"),
  chapterId: z.string().min(1, "Select a chapter"),
  meetingId: optionalText(),
  referringMemberId: optionalText(),
  purposeOfVisit: z.enum(["PROSPECTIVE_MEMBER", "END_CONSUMER", "CHIEF_GUEST"]).optional(),
  meetingOption: z.enum(["MEETING_ONLY", "MEETING_BREAKFAST"]).optional(),
  paymentScreenshotUrl: optionalText(),
});

/**
 * No permission check — public registration endpoint (brief §23: online
 * visitor registration). Re-validates that registration is still open
 * server-side, since a meeting can be cancelled or fill up between page
 * load and submit — mirrors submitApplication's availability re-check.
 */
export async function registerVisitor(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const ip = await getClientIp();
  // Higher ceiling than the other public forms — a shared kiosk/office
  // connection registering several real people for one meeting is plausible.
  const allowed = await rateLimit(`visitor:${ip}`, { limit: 20, windowSeconds: 3600 });
  if (!allowed) return { error: TOO_MANY_REQUESTS_ERROR, success: false };

  const { meetingId, ...rest } = parsed.data;

  // Captured for the confirmation email below — kept outside the branch
  // block so it's still in scope after registration succeeds.
  let confirmation: { title: string; startsAt: Date; venue: string | null } | null = null;

  if (meetingId) {
    const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting || meeting.status !== "SCHEDULED" || !meeting.visitorRegistrationEnabled) {
      return { error: "Registration for this meeting is no longer open.", success: false };
    }
    confirmation = { title: meeting.title, startsAt: meeting.startsAt, venue: meeting.venue };
  }

  await db.visitor.create({ data: { ...rest, meetingId } });

  if (confirmation) {
    // Backlog #35 — the Visitor row above is already committed; a failed
    // confirmation email (bad address, provider outage) must not turn a
    // successful registration into a 500 for the visitor.
    try {
      const chapter = await db.chapter.findUnique({ where: { id: rest.chapterId }, select: { name: true } });
      await notifyVisitorRegistered({
        visitorName: rest.name,
        visitorEmail: rest.email,
        chapterName: chapter?.name ?? "your chapter",
        title: confirmation.title,
        startsAt: confirmation.startsAt,
        venue: confirmation.venue,
      });
    } catch (error) {
      console.error("notifyVisitorRegistered failed (registration still succeeded):", error);
    }
  }

  revalidatePath("/admin/visitors");
  return { error: undefined, success: true };
}
