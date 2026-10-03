"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

/**
 * Phase 29 — "View contact details" on a public member (vendor) profile.
 * Phone/WhatsApp/email are deliberately NOT in the page's HTML or JSON-LD any
 * more; these two actions are the only way to get them, and both record a
 * VendorContactRequest row first. The remember-me cookie only holds the id
 * of this device's earlier, real submission — never the contact data itself
 * — so forging it requires guessing a cuid.
 */

const REQUESTER_COOKIE = "bwf_contact_requester";
const REQUESTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // ~6 months
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type VendorContact = { name: string; phone: string | null; whatsapp: string | null; email: string | null };

export type RevealResult = { contact?: VendorContact; needsForm?: boolean; error?: string };
type SubmitFields = { name: string; phone: string; email: string; requirement: string };
/** `fields` is echoed back on error — React resets a form after its action runs, so without this a typo in the phone number would wipe everything the visitor typed. */
export type SubmitState = { contact?: VendorContact; error?: string; fields?: SubmitFields };

async function getContact(slug: string) {
  return db.member.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, name: true, phone: true, whatsapp: true, email: true },
  });
}

function toContact(member: NonNullable<Awaited<ReturnType<typeof getContact>>>): VendorContact {
  return { name: member.name, phone: member.phone, whatsapp: member.whatsapp, email: member.email };
}

/**
 * A typed-in pop-up submission is always its own record (it may carry a new
 * requirement). Only the remembered-device path collapses repeats: the same
 * requester re-clicking the same vendor within a day is one request, not many.
 */
async function recordRequest(
  memberId: string,
  data: { requesterName: string; requesterPhone: string; requesterEmail?: string | null; requirement?: string | null },
  reusedFromDevice: boolean,
) {
  if (reusedFromDevice) {
    const recent = await db.vendorContactRequest.findFirst({
      where: { memberId, requesterPhone: data.requesterPhone, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
    });
    if (recent) return recent;
  }
  return db.vendorContactRequest.create({ data: { memberId, ...data, reusedFromDevice } });
}

/** Called on button click. Reveals immediately if this device already filled the form once; otherwise tells the client to open the pop-up. */
export async function revealVendorContact(slug: string): Promise<RevealResult> {
  const cookieStore = await cookies();
  const requesterId = cookieStore.get(REQUESTER_COOKIE)?.value;
  if (!requesterId) return { needsForm: true };

  const previous = await db.vendorContactRequest.findUnique({ where: { id: requesterId } });
  if (!previous) return { needsForm: true };

  const ip = await getClientIp();
  if (!(await rateLimit(`vendor-contact-reveal:${ip}`, { limit: 40, windowSeconds: 3600 }))) {
    return { error: TOO_MANY_REQUESTS_ERROR };
  }

  const member = await getContact(slug);
  if (!member) return { error: "This member profile is no longer available." };

  await recordRequest(
    member.id,
    {
      requesterName: previous.requesterName,
      requesterPhone: previous.requesterPhone,
      requesterEmail: previous.requesterEmail,
      requirement: null,
    },
    true,
  );

  return { contact: toContact(member) };
}

const submitSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, "Please enter a valid phone number."),
  email: z.email("Please enter a valid email address.").optional().or(z.literal("")),
  requirement: z.string().trim().max(1000).optional(),
});

export async function submitVendorContactRequest(slug: string, _prevState: SubmitState | undefined, formData: FormData): Promise<SubmitState> {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const fields: SubmitFields = { name: text("name"), phone: text("phone"), email: text("email"), requirement: text("requirement") };

  const parsed = submitSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", fields };

  const ip = await getClientIp();
  if (!(await rateLimit(`vendor-contact-submit:${ip}`, { limit: 10, windowSeconds: 3600 }))) {
    return { error: TOO_MANY_REQUESTS_ERROR, fields };
  }

  const member = await getContact(slug);
  if (!member) return { error: "This member profile is no longer available.", fields };

  const request = await recordRequest(
    member.id,
    {
      requesterName: parsed.data.name,
      requesterPhone: parsed.data.phone,
      requesterEmail: parsed.data.email || null,
      requirement: parsed.data.requirement || null,
    },
    false,
  );

  const cookieStore = await cookies();
  cookieStore.set(REQUESTER_COOKIE, request.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REQUESTER_COOKIE_MAX_AGE,
  });

  return { contact: toContact(member) };
}
