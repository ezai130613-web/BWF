import { NextResponse } from "next/server";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { getContent } from "@/lib/content";
import { generateRosterPdf, type RosterAssignmentRow, type RosterMemberRow } from "@/lib/roster/generate";

/**
 * Roster Sheet interactive management (2026-09-16 correction) — the PDF is
 * now the final output of a saved Roster, not something computed live.
 * `?meetingId=` is the only param; everything else (chief guests, open
 * categories, notes toggle, member scores/ranking) comes straight from the
 * persisted `Roster`/`RosterScore` rows the admin already saved through
 * `/admin/roster/[meetingId]` — never recomputed or re-derived from the
 * request here.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId is required." }, { status: 400 });
  }

  const meeting = await db.meeting.findUnique({ where: { id: meetingId }, include: { chapter: true } });
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  }

  await requireChapterAccess(meeting.chapterId, "roster:manage");

  const roster = await db.roster.findUnique({
    where: { meetingId },
    include: {
      chiefGuests: true,
      openCategories: { orderBy: { name: "asc" } },
      scores: { include: { member: { include: { company: true, category: true } } }, orderBy: { order: "asc" } },
    },
  });

  if (!roster || !roster.savedAt) {
    return NextResponse.json(
      { error: "This meeting's roster hasn't been saved yet — save it from the Roster Sheets page before downloading." },
      { status: 409 },
    );
  }

  const [leadership, roleAssignments, feeContent] = await Promise.all([
    db.chapterLeadership.findMany({ where: { chapterId: meeting.chapterId }, include: { member: true, role: true } }),
    db.rosterAssignment.findMany({
      where: { chapterId: meeting.chapterId },
      include: { member: true, role: true },
      orderBy: [{ group: "asc" }, { role: { order: "asc" } }, { createdAt: "asc" }],
    }),
    getContent(["roster.visitorFeedbackQrUrl", "roster.whatsInItForYou"]),
  ]);

  const memberRows: RosterMemberRow[] = roster.scores.map((s) => ({
    name: s.member.name,
    phone: s.member.phone,
    email: s.member.email,
    address: s.member.address,
    photoUrl: s.member.photoUrl,
    company: s.member.company.name,
    category: s.member.category.name,
  }));

  const roleAssignmentRows: RosterAssignmentRow[] = roleAssignments.map((a) => ({
    group: a.group,
    roleLabel: a.role.label,
    memberName: a.member.name,
    photoUrl: a.member.photoUrl,
  }));

  const pdf = await generateRosterPdf({
    chapterName: meeting.chapter.name,
    leadership: leadership.map((l) => ({ roleKey: l.role.key, roleLabel: l.role.label, memberName: l.member.name, photoUrl: l.member.photoUrl })),
    roleAssignments: roleAssignmentRows,
    members: memberRows,
    chiefGuests: roster.chiefGuests.map((g) => ({ name: g.name, photoUrl: g.photoUrl, company: g.company, designation: g.designation })),
    openCategoryNames: roster.openCategories.map((c) => c.name),
    whatsInItForYou:
      feeContent["roster.whatsInItForYou"] ?? "Connect with builders, contractors, and suppliers in a focused networking space.",
    visitorFeedbackQrUrl: feeContent["roster.visitorFeedbackQrUrl"],
    notesEnabled: roster.notesEnabled,
  });

  await logActivity({
    action: "roster.generated",
    entity: "Meeting",
    entityId: meeting.id,
    metadata: { chapterId: meeting.chapterId, memberCount: memberRows.length, chiefGuestCount: roster.chiefGuests.length },
  });

  const filenameBase = `bwf-roster-${meeting.chapter.name.toLowerCase().replace(/\s+/g, "-")}-${meeting.startsAt.toISOString().slice(0, 10)}`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
