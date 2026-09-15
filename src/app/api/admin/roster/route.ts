import { NextResponse } from "next/server";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { getContent } from "@/lib/content";
import { getOpenCategoryNames } from "@/lib/chapters/availability";
import { formatInr, withGst } from "@/lib/format";
import { generateRosterPdf, type RosterAssignmentRow, type RosterMemberRow } from "@/lib/roster/generate";

/**
 * Phase 20 Batch 3 — Roster Sheet PDF generation. Query-param based (not a
 * dynamic route segment) so the admin page's plain GET form can drive it
 * with zero client JS, same convention as the old
 * /api/admin/exports/members route. Re-derives chapter access from the
 * session server-side — never trusts the chapterId a Chapter Admin's own
 * meeting implies without checking it.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");
  const chiefGuestIds = searchParams.getAll("chiefGuestIds");

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId is required." }, { status: 400 });
  }

  const meeting = await db.meeting.findUnique({ where: { id: meetingId }, include: { chapter: true } });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  await requireChapterAccess(meeting.chapterId, "roster:manage");

  const [leadership, roleAssignments, members, chiefGuests, openCategoryNames, feeContent] = await Promise.all([
    db.chapterLeadership.findMany({ where: { chapterId: meeting.chapterId }, include: { member: true, role: true } }),
    db.rosterAssignment.findMany({
      where: { chapterId: meeting.chapterId },
      include: { member: true, role: true },
      orderBy: [{ role: { order: "asc" } }, { createdAt: "asc" }],
    }),
    db.member.findMany({
      where: { chapterId: meeting.chapterId, status: "ACTIVE" },
      include: { company: true, category: true },
      orderBy: { joinedAt: "asc" },
    }),
    // Never trust the client-picked list — only guests that actually belong to this meeting's chapter can be featured.
    chiefGuestIds.length > 0
      ? db.chiefGuest.findMany({ where: { id: { in: chiefGuestIds }, chapterId: meeting.chapterId } })
      : Promise.resolve([]),
    getOpenCategoryNames(meeting.chapterId),
    getContent(["roster.visitorFeedbackQrUrl", "fees.visitorPrebookMeetingBreakfast"]),
  ]);

  const memberRows: RosterMemberRow[] = members.map((m) => ({
    name: m.name,
    phone: m.phone,
    email: m.email,
    address: m.address,
    photoUrl: m.photoUrl,
    company: m.company.name,
    category: m.category.name,
  }));

  const roleAssignmentRows: RosterAssignmentRow[] = roleAssignments.map((a) => ({
    roleLabel: a.role.label,
    memberName: a.member.name,
    photoUrl: a.member.photoUrl,
  }));

  // PDFKit's built-in standard fonts (Helvetica etc.) don't include the ₹
  // glyph — it silently mis-renders as a stray superscript character rather
  // than throwing, so this is a real bug caught only by actually opening the
  // generated PDF, not by any type/lint check. "Rs." reads perfectly clearly
  // on a printed handout and needs no embedded font.
  const feeText = withGst(formatInr(feeContent["fees.visitorPrebookMeetingBreakfast"])).replace(/₹/g, "Rs. ");

  const pdf = await generateRosterPdf({
    chapterName: meeting.chapter.name,
    meetingTitle: meeting.title,
    meetingStartsAt: meeting.startsAt,
    meetingVenue: meeting.venue ?? meeting.chapter.meetingVenue,
    meetingAddress: meeting.address ?? meeting.chapter.meetingAddress,
    registrationFeeText: feeText,
    leadership: leadership.map((l) => ({ roleKey: l.role.key, roleLabel: l.role.label, memberName: l.member.name, photoUrl: l.member.photoUrl })),
    roleAssignments: roleAssignmentRows,
    members: memberRows,
    chiefGuests: chiefGuests.map((g) => ({ name: g.name, photoUrl: g.photoUrl, company: g.company, designation: g.designation })),
    openCategoryNames,
    visitorFeedbackQrUrl: feeContent["roster.visitorFeedbackQrUrl"],
  });

  await logActivity({
    action: "roster.generated",
    entity: "Meeting",
    entityId: meeting.id,
    metadata: { chapterId: meeting.chapterId, memberCount: memberRows.length, chiefGuestCount: chiefGuests.length },
  });

  const filenameBase = `bwf-roster-${meeting.chapter.name.toLowerCase().replace(/\s+/g, "-")}-${meeting.startsAt.toISOString().slice(0, 10)}`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
