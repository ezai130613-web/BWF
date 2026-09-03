"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

function revalidateChatbotPaths() {
  revalidatePath("/admin/chatbot");
  // The widget is rendered globally from (public)/layout.tsx, not one
  // specific page — same "revalidate broadly" call as the Website Content
  // CMS action, since there's no single page to target.
  revalidatePath("/", "layout");
}

const ACCESS_MODES = ["PUBLIC", "LOGIN_REQUIRED", "LIMITED_FREE_QUESTIONS"] as const;

const settingsSchema = z.object({
  isEnabled: z.string().optional(),
  accessMode: z.enum(ACCESS_MODES),
  freeQuestionsLimit: z.coerce.number().int().min(1).max(50),
});

export async function updateChatbotSettings(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("chatbot:manage");

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const data = {
    isEnabled: parsed.data.isEnabled === "on",
    accessMode: parsed.data.accessMode,
    freeQuestionsLimit: parsed.data.freeQuestionsLimit,
  };

  await db.chatbotSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  await logActivity({ userId: session.user.id, action: "chatbot_settings.updated" });

  revalidateChatbotPaths();
  return { error: undefined };
}

type ChatbotLeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "DISCARDED";

export async function setChatbotLeadStatus(leadId: string, status: ChatbotLeadStatus) {
  const session = await requirePermission("chatbot:manage");

  await db.chatbotLead.update({ where: { id: leadId }, data: { status } });

  await logActivity({
    userId: session.user.id,
    action: "chatbot_lead.status_changed",
    entity: "ChatbotLead",
    entityId: leadId,
    metadata: { status },
  });

  revalidatePath("/admin/chatbot");
}
