"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifyVisitorRegistered } from "@/lib/notifications";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { recordLead } from "@/lib/leads/record";
import type { Prisma } from "@/generated/prisma/client";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Two transient-failure shapes worth retrying, neither of which means
 * "capacity is full" (that determination only comes from the count check
 * *inside* the transaction below) — both found live, by actually forcing
 * concurrency, not from docs alone:
 *   - `code: "P2028"` ("unable to start a transaction in time") — this
 *     app's Postgres pool is capped at 5 connections app-wide
 *     (src/lib/db.ts), so a burst of concurrent registrations can exhaust
 *     it before Prisma's default 2s `maxWait`. Reproduced with 8
 *     truly-concurrent submissions against one capacity-3 event;
 *     `maxWait`/`timeout` below are raised so this is the rarer fallback,
 *     not the common case.
 *   - A genuine Serializable write conflict — the actual race this
 *     function exists to close — does NOT come through as the documented
 *     `code: "P2034"`, at least with `@prisma/adapter-pg` on Prisma 7. It's
 *     an `Error [DriverAdapterError]` whose `.cause` carries Postgres's own
 *     SQLSTATE (`originalCode: "40001"`, serialization_failure) and a
 *     `kind: "TransactionWriteConflict"` tag. Checked against the raw
 *     SQLSTATE (plus P2034 for safety) rather than only Prisma's own code,
 *     so this keeps working even if a future Prisma version re-wraps it.
 */
function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && (error.code === "P2034" || error.code === "P2028")) return true;
  if ("cause" in error && typeof error.cause === "object" && error.cause !== null) {
    const cause = error.cause as { originalCode?: string; kind?: string };
    if (cause.originalCode === "40001" || cause.kind === "TransactionWriteConflict") return true;
  }
  return false;
}

/**
 * Atomically re-checks event capacity and inserts the Visitor row in one
 * Serializable transaction (backlog #13) — a plain count()-then-create()
 * has a TOCTOU race where two concurrent submissions right at the last
 * slot could both read "under capacity" and both succeed, overshooting the
 * cap. Serializable isolation makes Postgres detect that write skew (both
 * transactions read the same count, then both write) and abort one side
 * with a write conflict instead of letting both through — retried via
 * isRetryableTransactionError() above, since that conflict is expected
 * contention here, not a real failure. A short jittered delay before each
 * retry avoids every waiting request retrying in lockstep and re-creating
 * the same contention.
 */
async function createVisitorWithCapacityCheck(
  eventId: string,
  capacity: number,
  data: Prisma.VisitorUncheckedCreateInput,
): Promise<boolean> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const registeredCount = await tx.visitor.count({ where: { eventId } });
          if (registeredCount >= capacity) return false;
          await tx.visitor.create({ data });
          return true;
        },
        { isolationLevel: "Serializable", maxWait: 8000, timeout: 10000 },
      );
    } catch (error) {
      if (isRetryableTransactionError(error) && attempt < MAX_ATTEMPTS) {
        await sleep(50 + Math.random() * 150);
        continue;
      }
      throw error;
    }
  }
  // Every loop iteration returns or throws; this is just to satisfy TS's control-flow analysis.
  throw new Error("unreachable");
}

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

  const ip = await getClientIp();
  // Higher ceiling than the other public forms — a shared kiosk/office
  // connection registering several real people for one meeting is plausible.
  const allowed = await rateLimit(`visitor:${ip}`, { limit: 20, windowSeconds: 3600 });
  if (!allowed) return { error: TOO_MANY_REQUESTS_ERROR, success: false };

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

  let event: Awaited<ReturnType<typeof db.event.findUnique>> = null;

  if (eventId) {
    event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== "SCHEDULED" || !event.registrationEnabled) {
      return { error: "Registration for this event is no longer open.", success: false };
    }
    if (event.registrationDeadline && event.registrationDeadline.getTime() < Date.now()) {
      return { error: "The registration deadline for this event has passed.", success: false };
    }
    confirmation = { kind: "event", title: event.title, startsAt: event.startsAt, venue: event.venue };
  }

  if (event?.capacity != null) {
    const registered = await createVisitorWithCapacityCheck(event.id, event.capacity, { ...rest, meetingId, eventId });
    if (!registered) return { error: "This event has reached capacity.", success: false };
  } else {
    await db.visitor.create({ data: { ...rest, meetingId, eventId } });
  }

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
        kind: confirmation.kind,
        title: confirmation.title,
        startsAt: confirmation.startsAt,
        venue: confirmation.venue,
      });
    } catch (error) {
      console.error("notifyVisitorRegistered failed (registration still succeeded):", error);
    }
  }

  await recordLead({
    source: eventId ? "EVENT_REGISTRATION" : "VISITOR_REGISTRATION",
    name: rest.name,
    phone: rest.phone,
    email: rest.email,
    memberId: rest.referringMemberId,
    chapterId: rest.chapterId,
    categoryId: rest.categoryId,
  });

  revalidatePath("/admin/visitors");
  return { error: undefined, success: true };
}
