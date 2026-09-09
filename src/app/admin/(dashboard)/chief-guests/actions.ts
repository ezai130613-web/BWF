"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const guestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  photoUrl: optionalText(),
  company: z.string().min(1, "Company / organisation is required"),
  designation: optionalText(),
  description: optionalText(),
  chapterId: optionalText(),
  visitedAt: optionalText(),
  displayOrder: z.coerce.number().int().optional().or(z.literal("")),
});

function revalidateChiefGuests() {
  revalidatePath("/admin/chief-guests");
  revalidatePath("/");
}

export async function createChiefGuest(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("chief_guests:manage");

  const parsed = guestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { visitedAt, displayOrder, chapterId, ...rest } = parsed.data;

  const guest = await db.chiefGuest.create({
    data: {
      ...rest,
      chapterId: chapterId ?? undefined,
      visitedAt: visitedAt ? new Date(visitedAt) : undefined,
      displayOrder: displayOrder === "" || displayOrder === undefined ? undefined : displayOrder,
    },
  });

  await logActivity({ action: "chief_guest.created", entity: "ChiefGuest", entityId: guest.id });
  revalidateChiefGuests();
  return { error: undefined };
}

const updateSchema = guestSchema.extend({
  guestId: z.string(),
  isPublished: z.string().optional(),
});

export async function updateChiefGuest(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("chief_guests:manage");

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { guestId, visitedAt, displayOrder, chapterId, isPublished, ...rest } = parsed.data;

  await db.chiefGuest.update({
    where: { id: guestId },
    data: {
      ...rest,
      chapterId: chapterId ?? null,
      visitedAt: visitedAt ? new Date(visitedAt) : null,
      displayOrder: displayOrder === "" || displayOrder === undefined ? null : displayOrder,
      isPublished: isPublished === "on",
    },
  });

  await logActivity({ action: "chief_guest.updated", entity: "ChiefGuest", entityId: guestId });
  revalidateChiefGuests();
  return { error: undefined };
}

export async function deleteChiefGuest(guestId: string) {
  await requirePermission("chief_guests:manage");
  await db.chiefGuest.delete({ where: { id: guestId } });
  await logActivity({ action: "chief_guest.deleted", entity: "ChiefGuest", entityId: guestId });
  revalidateChiefGuests();
}
