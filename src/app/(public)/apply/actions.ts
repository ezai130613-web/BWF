"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getChapterAvailability } from "@/lib/applications/availability";

const submitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.email(),
  companyName: z.string().min(1, "Company name is required"),
  designation: z.string().optional(),
  yearsInBusiness: z.coerce.number().int().min(0).optional().or(z.literal("")),
  referralSource: z.string().optional(),
  companyInfo: z.string().optional(),
  categoryId: z.string().min(1, "Select a category"),
  chapterId: z.string().optional(), // absent/empty => waiting list
  consent: z.literal("on", { error: "Please confirm you agree to be contacted about your application." }),
});

/**
 * No permission check — public submission endpoint (brief §17 step 4/5:
 * "Application enters Admin Dashboard"). Re-validates chapter availability
 * server-side rather than trusting whatever the client last rendered, since
 * a slot can fill between page load and submit.
 */
export async function submitApplication(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const { consent, chapterId, yearsInBusiness, ...rest } = parsed.data;
  void consent; // required by the schema (must be "on"); nothing further to persist

  let finalChapterId: string | null = null;
  let status: "NEW" | "WAITLISTED" = "NEW";

  if (chapterId) {
    const availability = await getChapterAvailability(parsed.data.categoryId);
    const chosen = availability.find((c) => c.chapterId === chapterId);
    if (!chosen || !chosen.available) {
      return { error: "That chapter is no longer available for this category — please refresh and try again.", success: false };
    }
    finalChapterId = chapterId;
  } else {
    status = "WAITLISTED";
  }

  await db.membershipApplication.create({
    data: {
      ...rest,
      yearsInBusiness: yearsInBusiness === "" ? undefined : yearsInBusiness,
      chapterId: finalChapterId,
      status,
    },
  });

  revalidatePath("/admin/applications");
  return { error: undefined, success: true };
}
