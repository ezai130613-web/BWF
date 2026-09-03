"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

const TYPES = ["MEETING", "EVENT", "MANAGEMENT", "GENERAL"] as const;

const submitSchema = z.object({
  type: z.enum(TYPES),
  name: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  message: z.string().min(1, "Please share your feedback"),
  chapterId: z.string().optional(),
});

/**
 * No permission check — this is the public submission endpoint, open to
 * anyone. Visibility is enforced on the read side instead: /admin/feedback
 * requires "feedback:view", which only Super Admin holds by default (brief
 * §34 — "Feedback must only be visible to Super Admin").
 */
export async function submitFeedback(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const ip = await getClientIp();
  const allowed = await rateLimit(`feedback:${ip}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) return { error: TOO_MANY_REQUESTS_ERROR, success: false };

  const { chapterId, email, name, ...rest } = parsed.data;

  await db.feedback.create({
    data: { ...rest, name: name || undefined, email: email || undefined, chapterId: chapterId || undefined },
  });

  return { error: undefined, success: true };
}
