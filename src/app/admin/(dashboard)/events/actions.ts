"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireChapterAccess, requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/lib/slugify";

/**
 * Event.chapterId is nullable (brief §26: "Chapter or Global"). A global
 * event has no chapter to scope a Chapter Admin's access against, so only
 * holders of the blanket events:manage permission (Central/Super Admin) may
 * create or edit one — mirrors how Chapter Admin holds no global permission
 * at all (see prisma/seed.ts).
 */
export async function requireEventAccess(chapterId: string | null) {
  if (chapterId) return requireChapterAccess(chapterId, "events:manage");
  return requirePermission("events:manage");
}

async function generateUniqueEventSlug(title: string) {
  const base = slugify(title) || "event";
  let slug = base;
  let suffix = 2;
  while (await db.event.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  chapterId: optionalText(),
  eventType: z.enum(["CHAPTER_MEETING", "NETWORKING_EVENT", "SEMINAR", "EXHIBITION", "CHAPTER_LAUNCH", "SPECIAL_EVENT"]),
  startsAt: z.string().min(1, "Date & time is required"),
  venue: optionalText(),
  imageUrl: optionalText(),
  capacity: z.coerce.number().int().min(1).optional().or(z.literal("")),
  registrationDeadline: optionalText(),
  description: optionalText(),
});

export async function createEvent(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, capacity, registrationDeadline, ...rest } = parsed.data;
  await requireEventAccess(chapterId ?? null);

  const slug = await generateUniqueEventSlug(parsed.data.title);

  const event = await db.event.create({
    data: {
      ...rest,
      slug,
      chapterId: chapterId ?? undefined,
      startsAt: new Date(rest.startsAt),
      capacity: capacity === "" ? undefined : capacity,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
    },
  });

  await logActivity({
    action: "event.created",
    entity: "Event",
    entityId: event.id,
    metadata: { chapterId: chapterId ?? null },
  });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  return { error: undefined };
}

const updateSchema = z.object({
  eventId: z.string(),
  title: z.string().min(1, "Title is required"),
  eventType: z.enum(["CHAPTER_MEETING", "NETWORKING_EVENT", "SEMINAR", "EXHIBITION", "CHAPTER_LAUNCH", "SPECIAL_EVENT"]),
  startsAt: z.string().min(1, "Date & time is required"),
  venue: optionalText(),
  imageUrl: optionalText(),
  capacity: z.coerce.number().int().min(1).optional().or(z.literal("")),
  registrationDeadline: optionalText(),
  description: optionalText(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  registrationEnabled: z.string().optional(),
});

export async function updateEvent(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { eventId, capacity, registrationDeadline, registrationEnabled, ...rest } = parsed.data;
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await requireEventAccess(event.chapterId);

  await db.event.update({
    where: { id: eventId },
    data: {
      ...rest,
      startsAt: new Date(rest.startsAt),
      capacity: capacity === "" ? null : capacity,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      registrationEnabled: registrationEnabled === "on",
    },
  });

  await logActivity({ action: "event.updated", entity: "Event", entityId: eventId });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/events/[slug]", "page");
  return { error: undefined };
}
