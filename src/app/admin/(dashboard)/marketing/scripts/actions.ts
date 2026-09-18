"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { generateAssistantReply, isOpenAiConfigured } from "@/lib/marketing/openai";

function revalidateScripts() {
  revalidatePath("/admin/marketing/scripts");
}

// --- AI chat ----------------------------------------------------------

export type ChatMessageRow = { id: string; role: "USER" | "ASSISTANT"; content: string; createdAt: Date };
export type ChatActionState = { conversationId?: string; messages: ChatMessageRow[]; error?: string };

async function loadMessages(conversationId: string): Promise<ChatMessageRow[]> {
  return db.aiMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
}

/**
 * Client spec §5A — a ChatGPT-style, continuous multi-turn conversation.
 * Only ever reads/writes via a Server Action (never a client-side OpenAI
 * call), so the API key never leaves the server. Access is enforced here
 * (not just by the page not linking to it) — the same `marketing:manage`
 * permission the rest of the Marketing Portal already requires, satisfying
 * "enforce access restrictions on both frontend and backend."
 */
export async function sendScriptChatMessage(prevState: ChatActionState, formData: FormData): Promise<ChatActionState> {
  await requirePermission("marketing:manage");

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { ...prevState, error: "Type a message first." };

  let conversationId = String(formData.get("conversationId") ?? "") || undefined;
  if (conversationId) {
    // The conversation may have been deleted from another tab/request since
    // this form was rendered (e.g. via the sidebar's delete button) — fall
    // back to starting a fresh one rather than a foreign-key crash.
    const stillExists = await db.aiConversation.findUnique({ where: { id: conversationId }, select: { id: true } });
    if (!stillExists) conversationId = undefined;
  }
  if (!conversationId) {
    const convo = await db.aiConversation.create({ data: { title: message.slice(0, 60) } });
    conversationId = convo.id;
  } else {
    await db.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  }

  await db.aiMessage.create({ data: { conversationId, role: "USER", content: message } });

  if (!isOpenAiConfigured()) {
    const messages = await loadMessages(conversationId);
    revalidateScripts();
    return { conversationId, messages, error: "AI is not configured yet — set OPENAI_API_KEY to enable responses." };
  }

  try {
    const history = (await loadMessages(conversationId)).map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
    const reply = await generateAssistantReply(history);
    await db.aiMessage.create({ data: { conversationId, role: "ASSISTANT", content: reply || "…" } });
  } catch {
    const messages = await loadMessages(conversationId);
    revalidateScripts();
    return { conversationId, messages, error: "The AI assistant couldn't respond right now. Please try again." };
  }

  const messages = await loadMessages(conversationId);
  revalidateScripts();
  return { conversationId, messages, error: undefined };
}

export async function deleteConversation(conversationId: string) {
  await requirePermission("marketing:manage");
  await db.aiConversation.delete({ where: { id: conversationId } });
  revalidateScripts();
}

// --- Scripts ------------------------------------------------------------

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((v) => v || undefined);

const contentFormatEnum = z.enum(["REEL", "POST", "CAROUSEL", "STORY", "VIDEO", "OTHER"]);
const scriptStatusEnum = z.enum(["DRAFT", "FINALISED"]);

const scriptSchema = z.object({
  title: z.string().min(1, "Script title is required"),
  topic: optionalText(),
  contentType: contentFormatEnum,
  content: z.string().min(1, "Script content is required"),
  status: scriptStatusEnum,
});

export async function createScript(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  const parsed = scriptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const script = await db.marketingScript.create({ data: parsed.data });
  await logActivity({ action: "marketing_script.created", entity: "MarketingScript", entityId: script.id });
  revalidateScripts();
  return { error: undefined };
}

const updateScriptSchema = scriptSchema.extend({ id: z.string() });

export async function updateScript(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  const parsed = updateScriptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { id, ...rest } = parsed.data;
  const existing = await db.marketingScript.findUnique({ where: { id } });
  if (!existing) return { error: "This script no longer exists." };

  await db.marketingScript.update({ where: { id }, data: rest });
  await logActivity({ action: "marketing_script.updated", entity: "MarketingScript", entityId: id });
  revalidateScripts();
  return { error: undefined };
}

export async function deleteScript(id: string) {
  await requirePermission("marketing:manage");
  await db.marketingScript.delete({ where: { id } });
  await logActivity({ action: "marketing_script.deleted", entity: "MarketingScript", entityId: id });
  revalidateScripts();
}

export async function duplicateScript(id: string) {
  await requirePermission("marketing:manage");

  const existing = await db.marketingScript.findUnique({ where: { id } });
  if (!existing) return;

  const copy = await db.marketingScript.create({
    data: {
      title: `${existing.title} (Copy)`,
      topic: existing.topic,
      contentType: existing.contentType,
      content: existing.content,
      status: "DRAFT",
    },
  });

  await logActivity({ action: "marketing_script.duplicated", entity: "MarketingScript", entityId: copy.id });
  revalidateScripts();
}
