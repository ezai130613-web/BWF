import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

const galleryEntrySchema = z.object({ url: z.string(), caption: z.string().optional() });
export type GalleryEntry = z.infer<typeof galleryEntrySchema>;

/**
 * The exact set of Member fields an admin can edit directly (see
 * updateMemberProfile in admin/members/actions.ts) — and, as of Phase 11,
 * the exact set a member can request an edit to via a
 * MemberProfileRevision. One schema, two callers, so the two paths can
 * never drift on what counts as "editable" (name/company/chapter/category
 * stay admin-only either way — those aren't in this schema at all).
 */
const optionalText = () => z.string().optional().transform((v) => v || undefined);

export const memberProfileFieldsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: optionalText(),
  bio: optionalText(),
  email: z.email().optional().or(z.literal("")),
  phone: optionalText(),
  services: optionalText(),
  specialisations: optionalText(),
  usp: optionalText(),
  yearsInBusiness: z.coerce.number().int().min(0).optional().or(z.literal("")),
  areasServed: optionalText(),
  certifications: optionalText(),
  majorProjects: optionalText(),
  clientele: optionalText(),
  whatsapp: optionalText(),
  website: optionalText(),
  address: optionalText(),
  googleMapsUrl: optionalText(),
  instagramUrl: optionalText(),
  linkedinUrl: optionalText(),
  facebookUrl: optionalText(),
  photoUrl: optionalText(),
  brochureUrl: optionalText(),
  videoUrl: optionalText(),
  photos: optionalText(),
  videos: optionalText(),
});

export type MemberProfileFields = z.infer<typeof memberProfileFieldsSchema>;

export const MEMBER_PROFILE_FIELD_LABELS: Record<keyof MemberProfileFields, string> = {
  name: "Name",
  designation: "Designation",
  bio: "Bio",
  email: "Email",
  phone: "Phone",
  services: "Services",
  specialisations: "Specialisations",
  usp: "USP",
  yearsInBusiness: "Years in business",
  areasServed: "Areas served",
  certifications: "Certifications",
  majorProjects: "Major projects",
  clientele: "Clientele",
  whatsapp: "WhatsApp",
  website: "Website",
  address: "Address",
  googleMapsUrl: "Google Maps URL",
  instagramUrl: "Instagram URL",
  linkedinUrl: "LinkedIn URL",
  facebookUrl: "Facebook URL",
  photoUrl: "Photo URL",
  brochureUrl: "Brochure URL (PDF)",
  videoUrl: "Video URL",
  photos: "Photo gallery",
  videos: "Video gallery",
};

/** Parses a JSON-encoded GalleryEntry[] string (from a hidden form input, same technique as Blog.faq) into the array Prisma's Json column expects, dropping any entry with a blank url. Returns undefined for an empty/blank input so an untouched gallery field doesn't wipe existing data. */
function parseGalleryEntries(raw: string | undefined): Prisma.InputJsonValue | undefined {
  if (!raw) return undefined;
  const entries = z.array(galleryEntrySchema).parse(JSON.parse(raw));
  const filtered = entries.filter((e) => e.url.trim());
  return filtered as Prisma.InputJsonValue;
}

/** Normalizes a parsed form submission into the plain values Member.update()/JSON storage expect ("" -> undefined for the optional number, "" already -> undefined for optionalText). */
export function normalizeMemberProfileFields(data: MemberProfileFields) {
  return {
    ...data,
    email: data.email || undefined,
    yearsInBusiness: data.yearsInBusiness === "" ? undefined : data.yearsInBusiness,
    photos: parseGalleryEntries(data.photos),
    videos: parseGalleryEntries(data.videos),
  };
}
