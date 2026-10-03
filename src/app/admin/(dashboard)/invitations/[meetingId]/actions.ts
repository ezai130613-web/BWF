"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { MAX_INVITATION_GUESTS } from "@/lib/invitations/poster";
import type { InvitationFormValues } from "./types";

async function getMeetingOrThrow(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

const text = (max: number) => z.string().max(max).transform((v) => v.trim());

const valuesSchema = z.object({
  eyebrow: text(120),
  headline: text(200),
  guests: z
    .array(
      z.object({
        name: text(120),
        designation: text(120),
        organisation: text(160),
        organisationNote: text(120),
        photoUrl: text(1000),
      }),
    )
    .max(MAX_INVITATION_GUESTS),
  whyAttendText: text(300),
  dateLabel: text(80),
  timeLabel: text(80),
  venueLabel: text(160),
  addressLabel: text(200),
  websiteLabel: text(100),
  contactPhones: text(120),
  ctaText: text(60),
  feeLabel: text(40),
  feeNote: text(120),
  isComplimentary: z.boolean(),
  includeQr: z.boolean(),
  qrTarget: z.enum(["LOCATION", "REGISTRATION"]),
  backgroundPhotoUrl: text(1000),
});

/** Upserts the invitation's own editable copy — never touches Meeting/ChiefGuest. */
export async function saveInvitation(meetingId: string, input: InvitationFormValues) {
  const meeting = await getMeetingOrThrow(meetingId);
  const session = await requireAdminSession();
  await requireChapterAccess(meeting.chapterId, "invitations:manage");

  const v = valuesSchema.parse(input);
  const data = {
    headingLine1: v.eyebrow,
    headingLine2: v.headline,
    guests: v.guests.filter((g) => g.name),
    whyAttendText: v.whyAttendText,
    dateLabel: v.dateLabel || null,
    timeLabel: v.timeLabel || null,
    venueLabel: v.venueLabel || null,
    addressLabel: v.addressLabel || null,
    websiteLabel: v.websiteLabel || null,
    contactPhones: v.contactPhones || null,
    ctaText: v.ctaText,
    feeLabel: v.feeLabel || null,
    feeNote: v.feeNote || null,
    isComplimentary: v.isComplimentary,
    includeQr: v.includeQr,
    qrTarget: v.qrTarget,
    backgroundPhotoUrl: v.backgroundPhotoUrl || null,
    meetingSnapshotAt: meeting.updatedAt,
  };

  const existed = await db.meetingInvitation.findUnique({ where: { meetingId }, select: { id: true } });
  await db.meetingInvitation.upsert({ where: { meetingId }, create: { meetingId, ...data }, update: data });

  await logActivity({
    userId: session.user.id,
    action: existed ? "meeting_invitation.updated" : "meeting_invitation.created",
    entity: "Meeting",
    entityId: meetingId,
  });

  revalidatePath(`/admin/invitations/${meetingId}`);
  revalidatePath("/admin/invitations");
}

/**
 * Proxies an image through the server so it can be drawn onto the poster
 * canvas as a data: URL — a cross-origin <img> drawn straight from R2 would
 * taint the canvas and silently break PNG export (spec requirement #9).
 * Restricted to our own storage bucket: this is called with admin-controlled
 * input (ChiefGuest.photoUrl, or a URL just returned by our own presigned
 * upload flow), never arbitrary user-supplied URLs, so this allowlist also
 * closes off any accidental SSRF surface.
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  await requireAdminSession();
  const publicBase = process.env.STORAGE_PUBLIC_URL;
  if (!publicBase || !url.startsWith(publicBase)) {
    throw new Error("Only images uploaded to this project's own storage can be used on the invitation.");
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load that image.");

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error("That file isn't an image.");
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
