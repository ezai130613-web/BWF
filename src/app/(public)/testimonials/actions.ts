"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const TYPES = ["MEMBER", "VISITOR", "CLIENT", "VIDEO", "SUCCESS_STORY"] as const;

const submitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  role: z.string().optional(),
  content: z.string().min(1, "Please share a few words"),
  type: z.enum(TYPES),
  chapterId: z.string().optional(),
  consent: z.literal("on", { error: "Please confirm you're okay with this being displayed publicly." }),
});

/**
 * No permission check — public submission endpoint. Always lands as
 * PENDING and is never auto-published (brief §33); an admin with
 * "testimonials:manage" must approve it via /admin/testimonials first.
 */
export async function submitTestimonial(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const { consent, chapterId, ...rest } = parsed.data;

  await db.testimonial.create({
    data: { ...rest, chapterId: chapterId || undefined, status: "PENDING", consent: consent === "on" },
  });

  revalidatePath("/admin/testimonials");
  return { error: undefined, success: true };
}
