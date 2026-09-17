"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import type { InvitationFormValues } from "./types";

async function getMeetingOrThrow(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error("Meeting not found.");
  return meeting;
}

/** Upserts the invitation's own editable copy — never touches Meeting/ChiefGuest. */
export async function saveInvitation(meetingId: string, values: InvitationFormValues) {
  const meeting = await getMeetingOrThrow(meetingId);
  const session = await requireAdminSession();
  await requireChapterAccess(meeting.chapterId, "invitations:manage");

  const existed = await db.meetingInvitation.findUnique({ where: { meetingId }, select: { id: true } });

  await db.meetingInvitation.upsert({
    where: { meetingId },
    create: { meetingId, ...values, meetingSnapshotAt: meeting.updatedAt },
    update: { ...values, meetingSnapshotAt: meeting.updatedAt },
  });

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
  const publicBase = process.env.STORAGE_PUBLIC_URL;
  if (!publicBase || !url.startsWith(publicBase)) {
    throw new Error("Only images uploaded to this project's own storage can be used on the invitation.");
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load that image.");

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}
