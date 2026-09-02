"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

function revalidateTestimonialPaths() {
  revalidatePath("/admin/testimonials");
  revalidatePath("/testimonials");
  revalidatePath("/");
  revalidatePath("/chapters/[slug]", "page");
}

const TYPES = ["MEMBER", "VISITOR", "CLIENT", "VIDEO", "SUCCESS_STORY"] as const;

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  role: z.string().optional(),
  content: z.string().min(1, "Testimonial text is required"),
  type: z.enum(TYPES),
  chapterId: z.string().optional(),
  consent: z.literal("on").optional(),
});

/** Admin-authored testimonial — published immediately (brief §33: "Admin-created content may be published directly"). */
export async function createTestimonialDirect(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("testimonials:manage");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  if (!parsed.data.consent) return { error: "Consent is required before this can be published." };

  const { consent, chapterId, ...rest } = parsed.data;
  void consent;

  const testimonial = await db.testimonial.create({
    data: { ...rest, chapterId: chapterId || undefined, status: "APPROVED", consent: true },
  });

  await logActivity({
    userId: session.user.id,
    action: "testimonial.created",
    entity: "Testimonial",
    entityId: testimonial.id,
  });

  revalidateTestimonialPaths();
  return { error: undefined };
}

export async function setTestimonialStatus(testimonialId: string, status: "APPROVED" | "REJECTED") {
  const session = await requirePermission("testimonials:manage");

  await db.testimonial.update({ where: { id: testimonialId }, data: { status } });

  await logActivity({
    userId: session.user.id,
    action: status === "APPROVED" ? "testimonial.approved" : "testimonial.rejected",
    entity: "Testimonial",
    entityId: testimonialId,
  });

  revalidateTestimonialPaths();
}

export async function toggleTestimonialFeatured(testimonialId: string) {
  const session = await requirePermission("testimonials:manage");

  const testimonial = await db.testimonial.findUniqueOrThrow({ where: { id: testimonialId } });
  await db.testimonial.update({ where: { id: testimonialId }, data: { featured: !testimonial.featured } });

  await logActivity({
    userId: session.user.id,
    action: "testimonial.featured_toggled",
    entity: "Testimonial",
    entityId: testimonialId,
  });

  revalidateTestimonialPaths();
}
