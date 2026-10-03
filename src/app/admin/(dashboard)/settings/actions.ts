"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { setBooleanSetting, type SettingKey } from "@/lib/settings";
import { logActivity } from "@/lib/audit";

/** Admin → Settings (2026-10-03). Super Admin only (`users:manage`). */

const TOGGLEABLE: SettingKey[] = ["feedback.notifySuperAdmins", "memberActivation.requireEmailCode"];

export async function toggleSetting(key: SettingKey, value: boolean) {
  const session = await requirePermission("users:manage");
  if (!TOGGLEABLE.includes(key)) throw new Error("Unknown setting");
  await setBooleanSetting(key, value);
  await logActivity({ userId: session.user.id, action: "settings.updated", metadata: { key, value } });
  revalidatePath("/admin/settings");
}

const addSchema = z.object({ email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()) });

export async function addFeedbackRecipient(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await requirePermission("users:manage");
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email." };

  const existing = await db.feedbackEmailRecipient.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "That address is already in the list." };

  await db.feedbackEmailRecipient.create({ data: { email: parsed.data.email } });
  await logActivity({ userId: session.user.id, action: "settings.feedback_recipient_added", metadata: { email: parsed.data.email } });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setFeedbackRecipientEnabled(id: string, isEnabled: boolean) {
  const session = await requirePermission("users:manage");
  const recipient = await db.feedbackEmailRecipient.update({ where: { id }, data: { isEnabled } });
  await logActivity({
    userId: session.user.id,
    action: "settings.feedback_recipient_toggled",
    metadata: { email: recipient.email, isEnabled },
  });
  revalidatePath("/admin/settings");
}

export async function removeFeedbackRecipient(id: string) {
  const session = await requirePermission("users:manage");
  const recipient = await db.feedbackEmailRecipient.delete({ where: { id } });
  await logActivity({ userId: session.user.id, action: "settings.feedback_recipient_removed", metadata: { email: recipient.email } });
  revalidatePath("/admin/settings");
}
