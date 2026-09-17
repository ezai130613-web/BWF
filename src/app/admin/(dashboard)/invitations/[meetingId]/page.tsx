import { notFound } from "next/navigation";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { generateAttendanceToken, getVisitorCheckinUrl } from "@/lib/attendance/qr";
import { InvitationEditor } from "./invitation-editor";
import type { InvitationFormValues, InvitationSourceData } from "./types";

async function getMeetingWithToken(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return null;

  // Same "generate once, reuse forever" rule as /admin/visitors-qr — the
  // invitation's QR must be the exact same registration link visitors would
  // get from that page, not a second, independent token.
  if (!meeting.visitorAttendanceQrToken) {
    return db.meeting.update({ where: { id: meetingId }, data: { visitorAttendanceQrToken: generateAttendanceToken() } });
  }
  return meeting;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default async function InvitationEditPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;

  const bareMeeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!bareMeeting) notFound();
  await requireChapterAccess(bareMeeting.chapterId, "invitations:manage");

  const meeting = await getMeetingWithToken(meetingId);
  if (!meeting) notFound();

  const [chapter, chiefGuest, invitation] = await Promise.all([
    db.chapter.findUniqueOrThrow({ where: { id: meeting.chapterId } }),
    meeting.chiefGuestId ? db.chiefGuest.findUnique({ where: { id: meeting.chiefGuestId } }) : Promise.resolve(null),
    db.meetingInvitation.findUnique({ where: { meetingId } }),
  ]);

  const checkinUrl = meeting.visitorAttendanceQrToken ? getVisitorCheckinUrl(meeting.visitorAttendanceQrToken) : null;

  const source: InvitationSourceData = {
    chapterLabel: `BWF – ${chapter.name}`,
    meetingTitle: meeting.title,
    meetingDateIso: meeting.startsAt.toISOString().slice(0, 10),
    defaultDateLabel: formatDateLabel(meeting.startsAt),
    defaultTimeLabel: formatTimeLabel(meeting.startsAt),
    defaultVenueLabel: meeting.venue ?? "",
    defaultAddressLabel: meeting.address ?? "",
    defaultGuestName: chiefGuest?.name ?? "",
    defaultGuestDesignation: chiefGuest?.designation ?? "",
    defaultGuestOrganisation: chiefGuest?.company ?? "",
    defaultGuestPhotoUrl: chiefGuest?.photoUrl ?? "",
    checkinUrl,
  };

  const initialValues: InvitationFormValues = invitation
    ? {
        headingLine1: invitation.headingLine1,
        headingLine2: invitation.headingLine2,
        guestName: invitation.guestName ?? "",
        guestDesignation: invitation.guestDesignation ?? "",
        guestOrganisation: invitation.guestOrganisation ?? "",
        guestPhotoUrl: invitation.guestPhotoUrl ?? "",
        whyAttendText: invitation.whyAttendText,
        dateLabel: invitation.dateLabel ?? "",
        timeLabel: invitation.timeLabel ?? "",
        venueLabel: invitation.venueLabel ?? "",
        addressLabel: invitation.addressLabel ?? "",
        feeLabel: invitation.feeLabel ?? "",
        isComplimentary: invitation.isComplimentary,
        includeQr: invitation.includeQr && Boolean(checkinUrl),
      }
    : {
        headingLine1: "BUILDERS WORLD FORUM",
        headingLine2: "YOU ARE INVITED",
        guestName: source.defaultGuestName,
        guestDesignation: source.defaultGuestDesignation,
        guestOrganisation: source.defaultGuestOrganisation,
        guestPhotoUrl: source.defaultGuestPhotoUrl,
        whyAttendText:
          "Connect with entrepreneurs, build meaningful business relationships, exchange referrals and discover new opportunities through the Builders World Forum.",
        dateLabel: source.defaultDateLabel,
        timeLabel: source.defaultTimeLabel,
        venueLabel: source.defaultVenueLabel,
        addressLabel: source.defaultAddressLabel,
        feeLabel: "",
        isComplimentary: false,
        includeQr: Boolean(checkinUrl),
      };

  // Spec §7 — "indicate newer meeting information is available." Compared
  // against the snapshot taken at the invitation's last save/refresh.
  const isStale = Boolean(invitation) && meeting.updatedAt.getTime() > invitation!.meetingSnapshotAt.getTime();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{source.chapterLabel}</p>
      </div>

      <InvitationEditor meetingId={meeting.id} source={source} initialValues={initialValues} isStale={isStale} hasSavedInvitation={Boolean(invitation)} />
    </div>
  );
}
