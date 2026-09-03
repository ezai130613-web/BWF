"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifyChatbotLeadCaptured } from "@/lib/notifications";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

const captureLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().optional(),
  requirement: z.string().min(1, "Tell us a little about what you need"),
  sessionId: z.string().optional(),
});

/**
 * No permission check — public submission endpoint, same shape as
 * submitTestimonial/submitFeedback. No consent checkbox (unlike
 * Testimonial): the visitor is the one asking to be contacted, which is a
 * different act from consenting to public display — see docs/ARCHITECTURE.md.
 */
export async function captureChatbotLead(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = captureLeadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const ip = await getClientIp();
  const allowed = await rateLimit(`chatbot-lead:${ip}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) return { error: TOO_MANY_REQUESTS_ERROR, success: false };

  const { sessionId, email, ...rest } = parsed.data;

  const conversation = sessionId
    ? await db.chatbotConversation.findUnique({ where: { sessionId }, select: { id: true } })
    : null;

  await db.chatbotLead.create({
    data: {
      ...rest,
      email: email || undefined,
      conversationId: conversation?.id,
    },
  });

  await notifyChatbotLeadCaptured({ name: rest.name, phone: rest.phone, email: email || undefined, requirement: rest.requirement });

  revalidatePath("/admin/chatbot");
  return { error: undefined, success: true };
}
