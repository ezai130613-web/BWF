"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import type { $Enums } from "@/generated/prisma/client";

export async function updateVisitorStatus(visitorId: string, status: $Enums.VisitorStatus) {
  const visitor = await db.visitor.findUniqueOrThrow({ where: { id: visitorId } });
  await requireChapterAccess(visitor.chapterId, "visitors:manage");

  await db.visitor.update({ where: { id: visitorId }, data: { status } });

  await logActivity({
    action: "visitor.status_changed",
    entity: "Visitor",
    entityId: visitorId,
    metadata: { status },
  });

  revalidatePath("/admin/visitors");
}

const notesSchema = z.object({
  visitorId: z.string(),
  notes: z.string().optional(),
});

export async function updateVisitorNotes(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { visitorId, notes } = parsed.data;
  const visitor = await db.visitor.findUniqueOrThrow({ where: { id: visitorId } });
  await requireChapterAccess(visitor.chapterId, "visitors:manage");

  await db.visitor.update({ where: { id: visitorId }, data: { notes: notes || null } });

  await logActivity({ action: "visitor.notes_updated", entity: "Visitor", entityId: visitorId });

  revalidatePath("/admin/visitors");
  return { error: undefined };
}
