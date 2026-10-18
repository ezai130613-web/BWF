"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getChapterAvailability } from "@/lib/applications/availability";
import { notifyApplicationSubmitted } from "@/lib/notifications";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { isOwnStorageKey, isOwnStorageUrl } from "@/lib/storage";
import { GST_FORMAT_ERROR, isValidGstNumber, normalizeGstNumber } from "@/lib/companies/gst";

const optionalText = () => z.string().optional().transform((v) => v?.trim() || undefined);

/**
 * Applicant-typed links end up as hrefs on the public member profile after
 * conversion, so anything that isn't plain http(s) is refused here. A bare
 * "www.example.com" gets https:// added rather than being rejected.
 */
const optionalWebUrl = (label: string) =>
  optionalText().pipe(
    z
      .string()
      .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
      .pipe(z.url({ protocol: /^https?$/, error: `${label} doesn't look like a valid link.` }))
      .optional(),
  );

const submitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.email(),
  companyName: z.string().min(1, "Company name is required"),
  designation: z.string().optional(),
  yearsInBusiness: z.coerce.number().int().min(0).optional().or(z.literal("")),
  referralSource: z.string().optional(),
  companyInfo: z.string().optional(),
  paymentScreenshotUrl: optionalText(),
  // 2026-10-19 — everything a selected applicant's profile needs, asked up front.
  whatsapp: optionalText(),
  address: z.string().trim().min(1, "Business address is required"),
  bio: optionalText(),
  services: optionalText(),
  areasServed: optionalText(),
  gstNumber: optionalText(),
  website: optionalWebUrl("Website"),
  youtubeUrl: optionalWebUrl("YouTube"),
  linkedinUrl: optionalWebUrl("LinkedIn"),
  instagramUrl: optionalWebUrl("Instagram"),
  facebookUrl: optionalWebUrl("Facebook"),
  photoUrl: z.string().min(1, "Please upload your photograph."),
  companyLogoUrl: optionalText(),
  aadhaarFileKey: z.string().min(1, "Please upload your Aadhaar card."),
  categoryId: z.string().min(1, "Select a category"),
  chapterId: z.string().optional(), // absent/empty => waiting list
  consent: z.literal("on", { error: "Please confirm you agree to be contacted about your application." }),
  termsAccepted: z.literal("on", { error: "Please read and accept the Membership Terms & Conditions to apply." }),
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

  const ip = await getClientIp();
  const allowed = await rateLimit(`application:${ip}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) return { error: TOO_MANY_REQUESTS_ERROR, success: false };

  const { consent, termsAccepted, chapterId, yearsInBusiness, gstNumber: rawGst, ...rest } = parsed.data;
  void consent; // required by the schema (must be "on"); nothing further to persist
  void termsAccepted; // required by the schema; persisted as termsAcceptedAt below

  const gstNumber = rawGst ? normalizeGstNumber(rawGst) : undefined;
  if (gstNumber && !isValidGstNumber(gstNumber)) return { error: GST_FORMAT_ERROR, success: false };

  // Uploads must be files this site issued, not arbitrary URLs/keys posted
  // straight at the action — they're shown to admins and, after conversion,
  // on the public profile.
  if (!isOwnStorageUrl(rest.photoUrl, "image")) return { error: "Please upload your photograph again.", success: false };
  if (rest.companyLogoUrl && !isOwnStorageUrl(rest.companyLogoUrl, "image")) {
    return { error: "Please upload your company logo again.", success: false };
  }
  if (!isOwnStorageKey(rest.aadhaarFileKey, "identityDocument")) {
    return { error: "Please upload your Aadhaar card again.", success: false };
  }
  if (rest.paymentScreenshotUrl && !isOwnStorageUrl(rest.paymentScreenshotUrl, "image")) {
    return { error: "Please upload your payment screenshot again.", success: false };
  }

  // Same scope as the /apply dropdown — a stale form can't submit a category
  // an admin has since deactivated or taken off the Apply form.
  const offered = await db.category.findFirst({
    where: { id: rest.categoryId, isActive: true, showOnApplyForm: true },
    select: { id: true },
  });
  if (!offered) {
    return { error: "That category is no longer available for new applications — please refresh and try again.", success: false };
  }

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
      gstNumber,
      yearsInBusiness: yearsInBusiness === "" ? undefined : yearsInBusiness,
      chapterId: finalChapterId,
      status,
      termsAcceptedAt: new Date(),
    },
  });

  // Backlog #35 — the application above is already committed; a failed
  // confirmation/admin-alert email must not turn a successful submission
  // into a 500 for the applicant.
  try {
    const category = await db.category.findUnique({ where: { id: rest.categoryId }, select: { name: true } });
    await notifyApplicationSubmitted({
      applicantName: rest.name,
      applicantEmail: rest.email,
      companyName: rest.companyName,
      categoryName: category?.name ?? "your category",
      waitlisted: status === "WAITLISTED",
    });
  } catch (error) {
    console.error("notifyApplicationSubmitted failed (application still submitted):", error);
  }

  revalidatePath("/admin/applications");
  return { error: undefined, success: true };
}
