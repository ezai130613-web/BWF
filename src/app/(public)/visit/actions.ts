"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifyVisitorRegistered } from "@/lib/notifications";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.email(),
  company: optionalText(),
  categoryId: z.string().min(1, "Select a category"),
  chapterId: z.string().min(1, "Select a chapter"),
  meetingId: optionalText(),
  eventId: optionalText(),
  referringMemberId: optionalText(),
});

/**
 * No permission check — public registration endpoint (brief §23: online
 * visitor registration). Re-validates that registration is still open
 * server-side, since a meeting/event can be cancelled or fill up between
 * page load and submit — mirrors submitApplication's availability re-check.
 */
export async function registerVisitor(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const { meetingId, eventId, ...rest } = parsed.data;

  // Captured for the confirmation email below — kept outside the branch
  // blocks so both are still in scope after registration succeeds.
  let confirmation: { kind: "meeting" | "event"; title: string; startsAt: Date; venue: string | null } | null = null;

  if (meetingId) {
    const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting || meeting.status !== "SCHEDULED" || !meeting.visitorRegistrationEnabled) {
      return { error: "Registration for this meeting is no longer open.", success: false };
    }
    confirmation = { kind: "meeting", title: meeting.title, startsAt: meeting.startsAt, venue: meeting.venue };
  }

  if (eventId) {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== "SCHEDULED" || !event.registrationEnabled) {
      return { error: "Registration for this event is no longer open.", success: false };
    }
    if (event.registrationDeadline && event.registrationDeadline.getTime() < Date.now()) {
      return { error: "The registration deadline for this event has passed.", success: false };
    }
    if (event.capacity != null) {
      const registeredCount = await db.visitor.count({ where: { eventId } });
      if (registeredCount >= event.capacity) {
        return { error: "This event has reached capacity.", success: false };
      }
    }
    confirmation = { kind: "event", title: event.title, startsAt: event.startsAt, venue: event.venue };
  }

  await db.visitor.create({
    data: { ...rest, meetingId, eventId },
  });

  if (confirmation) {
    const chapter = await db.chapter.findUnique({ where: { id: rest.chapterId }, select: { name: true } });
    await notifyVisitorRegistered({
      visitorName: rest.name,
      visitorEmail: rest.email,
      chapterName: chapter?.name ?? "your chapter",
      kind: confirmation.kind,
      title: confirmation.title,
      startsAt: confirmation.startsAt,
      venue: confirmation.venue,
    });
  }

  revalidatePath("/admin/visitors");
  return { error: undefined, success: true };
}
