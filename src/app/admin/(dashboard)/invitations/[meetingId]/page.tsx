import { notFound } from "next/navigation";
import { Poppins, Dancing_Script } from "next/font/google";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { generateAttendanceToken, getVisitorCheckinUrl } from "@/lib/attendance/qr";
import { formatIst, istParts } from "@/lib/ist";
import { SITE_URL } from "@/lib/site";
import { MAX_INVITATION_GUESTS, type InvitationGuest } from "@/lib/invitations/poster";
import { InvitationEditor } from "./invitation-editor";
import type { InvitationFormValues, InvitationSourceData, QrTarget } from "./types";

// The reference invitation's typography: a geometric sans throughout plus a
// script tagline under the wordmark. Loaded only on this page.
const posterSans = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poster-sans" });
const posterScript = Dancing_Script({ subsets: ["latin"], weight: ["700"], variable: "--font-poster-script" });

async function getMeetingWithToken(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return null;
  // Same "generate once, reuse forever" rule as /admin/visitors-qr — the
  // registration QR must be the exact link that page shows.
  if (!meeting.visitorAttendanceQrToken) {
    return db.meeting.update({ where: { id: meetingId }, data: { visitorAttendanceQrToken: generateAttendanceToken() } });
  }
  return meeting;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** "Friday 25th September, 2026" (IST) — the reference's format. */
function formatDateLabel(date: Date) {
  const p = istParts(date);
  return `${formatIst(date, { weekday: "long" })} ${ordinal(p.day)} ${formatIst(date, { month: "long" })}, ${p.year}`;
}

function formatTime(date: Date) {
  return formatIst(date, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
}

/** Start – start+2½h, matching the reference's "7:00 AM – 9:30 AM"; editable. */
function formatTimeLabel(date: Date) {
  return `${formatTime(date)} – ${formatTime(new Date(date.getTime() + 150 * 60 * 1000))}`;
}

function defaultWebsite() {
  const host = new URL(SITE_URL).hostname;
  return host === "localhost" ? "www.buildersworldforum.com" : host.startsWith("www.") ? host : `www.${host}`;
}

function parseGuests(value: unknown): InvitationGuest[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((g): g is Record<string, unknown> => typeof g === "object" && g !== null)
    .map((g) => ({
      name: String(g.name ?? ""),
      designation: String(g.designation ?? ""),
      organisation: String(g.organisation ?? ""),
      organisationNote: String(g.organisationNote ?? ""),
      photoUrl: String(g.photoUrl ?? ""),
    }))
    .slice(0, MAX_INVITATION_GUESTS);
}

export default async function InvitationEditPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;

  const bareMeeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!bareMeeting) notFound();
  await requireChapterAccess(bareMeeting.chapterId, "invitations:manage");

  const meeting = await getMeetingWithToken(meetingId);
  if (!meeting) notFound();

  const [chapter, chiefGuest, roster, invitation, previous, catalog, contactPhone] = await Promise.all([
    db.chapter.findUniqueOrThrow({ where: { id: meeting.chapterId } }),
    meeting.chiefGuestId ? db.chiefGuest.findUnique({ where: { id: meeting.chiefGuestId } }) : null,
    db.roster.findUnique({ where: { meetingId }, include: { chiefGuests: true } }),
    db.meetingInvitation.findUnique({ where: { meetingId } }),
    // The most recently saved invitation anywhere — its house-style fields
    // (headline, fee, phones, website…) carry forward so every invite keeps
    // the same pattern without retyping.
    db.meetingInvitation.findFirst({ where: { meetingId: { not: meetingId } }, orderBy: { updatedAt: "desc" } }),
    db.chiefGuest.findMany({
      where: { OR: [{ chapterId: meeting.chapterId }, { chapterId: null }] },
      orderBy: [{ displayOrder: "asc" }, { visitedAt: "desc" }, { name: "asc" }],
    }),
    db.websiteContent.findUnique({ where: { key: "contact.phone" } }),
  ]);

  const toGuest = (g: { name: string; designation: string | null; company: string | null; photoUrl: string | null }): InvitationGuest => ({
    name: g.name,
    designation: g.designation ?? "",
    organisation: g.company ?? "",
    organisationNote: "",
    photoUrl: g.photoUrl ?? "",
  });

  const checkinUrl = meeting.visitorAttendanceQrToken ? getVisitorCheckinUrl(meeting.visitorAttendanceQrToken) : null;
  const venue = meeting.venue ?? chapter.meetingVenue ?? "";
  const address = meeting.address ?? chapter.meetingAddress ?? "";
  const locationUrl =
    meeting.googleMapsUrl ||
    chapter.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue, address].filter(Boolean).join(", ") || "Builders World Forum Chennai")}`;

  const defaultGuests = (roster?.chiefGuests.length ? roster.chiefGuests : chiefGuest ? [chiefGuest] : [])
    .slice(0, MAX_INVITATION_GUESTS)
    .map(toGuest);

  const source: InvitationSourceData = {
    chapterLabel: `BWF – ${chapter.name}`,
    meetingTitle: meeting.title,
    meetingDateIso: meeting.startsAt.toISOString().slice(0, 10),
    defaultDateLabel: formatDateLabel(meeting.startsAt),
    defaultTimeLabel: formatTimeLabel(meeting.startsAt),
    defaultVenueLabel: venue,
    defaultAddressLabel: address,
    defaultGuests,
    guestCatalog: catalog.map((g) => ({ id: g.id, ...toGuest(g) })),
    checkinUrl,
    locationUrl,
  };

  const eyebrowDefault = `${chapter.location ? `${chapter.location} ` : ""}${chapter.name} Meeting Invitation`.toUpperCase();
  const legacyGuest: InvitationGuest[] = invitation?.guestName
    ? [{ name: invitation.guestName, designation: invitation.guestDesignation ?? "", organisation: invitation.guestOrganisation ?? "", organisationNote: "", photoUrl: invitation.guestPhotoUrl ?? "" }]
    : [];
  const style = invitation ?? previous;

  const initialValues: InvitationFormValues = {
    eyebrow: invitation?.headingLine1 ?? eyebrowDefault,
    headline: style?.headingLine2 ?? "NETWORKING FOR CONSTRUCTION MATERIAL SUPPLIERS AND PROFESSIONALS",
    guests: invitation ? (parseGuests(invitation.guests).length ? parseGuests(invitation.guests) : legacyGuest) : defaultGuests,
    whyAttendText: style?.whyAttendText ?? "Connect with builders, contractors, and suppliers in a focused networking space.",
    dateLabel: invitation?.dateLabel ?? source.defaultDateLabel,
    timeLabel: invitation?.timeLabel ?? source.defaultTimeLabel,
    venueLabel: invitation?.venueLabel ?? venue,
    addressLabel: invitation?.addressLabel ?? address,
    websiteLabel: style?.websiteLabel ?? defaultWebsite(),
    contactPhones: style?.contactPhones ?? contactPhone?.value ?? "",
    ctaText: style?.ctaText ?? "Call for Registration",
    feeLabel: style?.feeLabel ?? "₹1,000",
    feeNote: style?.feeNote ?? "+ GST 18% only (Including Breakfast)",
    isComplimentary: invitation?.isComplimentary ?? false,
    includeQr: invitation?.includeQr ?? true,
    qrTarget: ((style?.qrTarget as QrTarget | undefined) ?? "LOCATION") === "REGISTRATION" && checkinUrl ? "REGISTRATION" : "LOCATION",
    backgroundPhotoUrl: style?.backgroundPhotoUrl ?? "",
  };

  // Spec §7 — "indicate newer meeting information is available."
  const isStale = Boolean(invitation) && meeting.updatedAt.getTime() > invitation!.meetingSnapshotAt.getTime();

  return (
    <div className={`flex flex-col gap-6 ${posterSans.variable} ${posterScript.variable}`}>
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{source.chapterLabel}</p>
      </div>

      <InvitationEditor meetingId={meeting.id} source={source} initialValues={initialValues} isStale={isStale} hasSavedInvitation={Boolean(invitation)} />
    </div>
  );
}
