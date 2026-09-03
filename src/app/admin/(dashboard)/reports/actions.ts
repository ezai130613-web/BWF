"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const createRecipientSchema = z.object({
  email: z.email("Enter a valid email address"),
  scope: z.enum(["MASTER", "CHAPTER"]),
  chapterId: z.string().optional().transform((v) => v || undefined),
});

export async function addReportRecipient(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("reports:manage");

  const parsed = createRecipientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (parsed.data.scope === "CHAPTER" && !parsed.data.chapterId) {
    return { error: "Select a chapter for a chapter-scoped recipient." };
  }

  const recipient = await db.weeklyReportRecipient.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      scope: parsed.data.scope,
      chapterId: parsed.data.scope === "CHAPTER" ? parsed.data.chapterId : undefined,
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "weekly_report_recipient.added",
    entity: "WeeklyReportRecipient",
    entityId: recipient.id,
  });

  revalidatePath("/admin/reports");
  return { error: undefined };
}

export async function removeReportRecipient(recipientId: string) {
  const session = await requirePermission("reports:manage");

  await db.weeklyReportRecipient.delete({ where: { id: recipientId } });

  await logActivity({
    userId: session.user.id,
    action: "weekly_report_recipient.removed",
    entity: "WeeklyReportRecipient",
    entityId: recipientId,
  });

  revalidatePath("/admin/reports");
}

export async function toggleReportRecipientActive(recipientId: string) {
  const session = await requirePermission("reports:manage");

  const recipient = await db.weeklyReportRecipient.findUniqueOrThrow({ where: { id: recipientId } });
  await db.weeklyReportRecipient.update({ where: { id: recipientId }, data: { isActive: !recipient.isActive } });

  await logActivity({
    userId: session.user.id,
    action: "weekly_report_recipient.toggled",
    entity: "WeeklyReportRecipient",
    entityId: recipientId,
  });

  revalidatePath("/admin/reports");
}

const scheduleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  isEnabled: z.string().optional(),
});

export async function updateReportSchedule(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("reports:manage");

  const parsed = scheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await db.weeklyReportSettings.upsert({
    where: { id: "singleton" },
    update: { dayOfWeek: parsed.data.dayOfWeek, isEnabled: parsed.data.isEnabled === "on" },
    create: { id: "singleton", dayOfWeek: parsed.data.dayOfWeek, isEnabled: parsed.data.isEnabled === "on" },
  });

  await logActivity({ userId: session.user.id, action: "weekly_report_schedule.updated" });

  revalidatePath("/admin/reports");
  return { error: undefined };
}
