import { db } from "@/lib/db";
import { reminderScheduledFor } from "@/lib/meetings/reminders";
import { chapterScope, effectiveChapterId, istDayEnd, istDayStart } from "../access";
import type { ExportDataset } from "./types";
import type { Prisma, AttendanceStatus } from "@/generated/prisma/client";

const meetings: ExportDataset = {
  key: "meetings",
  title: "Meetings",
  scope: (a) => chapterScope(a, "meetings:manage"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const rows = await db.meeting.findMany({
      where: chapterId ? { chapterId } : {},
      include: {
        chapter: true,
        chiefGuest: { select: { name: true } },
        _count: { select: { visitors: true, visitorAttendances: true } },
        attendances: { select: { status: true } },
      },
      orderBy: { startsAt: "desc" },
    });
    return [
      {
        name: "Meetings",
        columns: [
          { header: "Date & Time", key: "startsAt", type: "datetime", width: 20 },
          { header: "Title", key: "title", width: 28 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Status", key: "status", width: 12 },
          { header: "Venue", key: "venue", width: 26 },
          { header: "Address", key: "address", width: 34 },
          { header: "Google Maps", key: "maps", type: "link" },
          { header: "Chief Guest", key: "chiefGuest", width: 22 },
          { header: "Agenda", key: "agenda", width: 30 },
          { header: "Members Present", key: "present", type: "number" },
          { header: "Members Absent", key: "absent", type: "number" },
          { header: "Visitor Registrations", key: "visitors", type: "number" },
          { header: "Visitors Checked In", key: "visitorCheckins", type: "number" },
          { header: "Reminder", key: "reminder", width: 16 },
          { header: "Reminder Due", key: "reminderDue", type: "datetime", width: 20 },
        ],
        rows: rows.map((m) => ({
          startsAt: m.startsAt,
          title: m.title,
          chapter: m.chapter.name,
          status: m.status,
          venue: m.venue,
          address: m.address,
          maps: m.googleMapsUrl,
          chiefGuest: m.chiefGuest?.name,
          agenda: m.agenda,
          present: m.attendances.filter((a) => a.status === "PRESENT").length,
          absent: m.attendances.filter((a) => a.status === "ABSENT").length,
          visitors: m._count.visitors,
          visitorCheckins: m._count.visitorAttendances,
          reminder: !m.reminderEnabled ? "Off" : (m.reminderStatus?.replace(/_/g, " ") ?? "Scheduled"),
          reminderDue: m.reminderEnabled ? reminderScheduledFor(m.startsAt) : null,
        })),
      },
    ];
  },
};

/**
 * Filters match /admin/attendance/members and the per-meeting page:
 * chapterId, meetingId, memberId, q (member name), status, from/to (meeting
 * date). With a meetingId, ACTIVE chapter members without a record are
 * listed as "Not checked in" — the same rows the per-meeting page shows.
 */
const attendance: ExportDataset = {
  key: "attendance",
  title: "Attendance",
  scope: (a) => chapterScope(a, "attendance:manage"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const meetingId = params.get("meetingId") || undefined;
    const memberId = params.get("memberId") || undefined;
    const q = params.get("q")?.trim() || undefined;
    const status = params.get("status");
    const from = istDayStart(params.get("from"));
    const to = istDayEnd(params.get("to"));

    const where: Prisma.AttendanceWhereInput = {
      AND: [
        chapterId ? { meeting: { chapterId } } : {},
        meetingId ? { meetingId } : {},
        memberId ? { memberId } : {},
        q ? { member: { name: { contains: q, mode: "insensitive" } } } : {},
        status === "PRESENT" || status === "ABSENT" ? { status: status as AttendanceStatus } : {},
        from || to ? { meeting: { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } } : {},
      ],
    };

    const records = await db.attendance.findMany({
      where,
      include: { member: { include: { chapter: true, category: true } }, meeting: true },
      orderBy: [{ meeting: { startsAt: "desc" } }, { member: { name: "asc" } }],
    });

    type Row = {
      chapter: string;
      meeting: string;
      meetingDate: Date;
      member: string;
      category: string;
      status: string;
      checkedInAt: Date | null;
      correction: string | null;
    };
    const rows: Row[] = records.map((r) => ({
      chapter: r.member.chapter.name,
      meeting: r.meeting.title,
      meetingDate: r.meeting.startsAt,
      member: r.member.name,
      category: r.member.category.name,
      status: r.status === "PRESENT" ? "Present" : "Absent",
      checkedInAt: r.checkedInAt,
      correction: r.correctionReason,
    }));

    if (meetingId && !status && !q && !memberId) {
      const meeting = await db.meeting.findUnique({ where: { id: meetingId }, include: { chapter: true } });
      if (meeting && (!chapterId || meeting.chapterId === chapterId)) {
        const recorded = new Set(records.map((r) => r.memberId));
        const missing = await db.member.findMany({
          where: { chapterId: meeting.chapterId, status: "ACTIVE", id: { notIn: [...recorded] } },
          include: { category: true },
          orderBy: { name: "asc" },
        });
        for (const m of missing) {
          rows.push({
            chapter: meeting.chapter.name,
            meeting: meeting.title,
            meetingDate: meeting.startsAt,
            member: m.name,
            category: m.category.name,
            status: "Not checked in",
            checkedInAt: null,
            correction: null,
          });
        }
      }
    }

    return [
      {
        name: "Attendance",
        columns: [
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Meeting Date", key: "meetingDate", type: "date", width: 14 },
          { header: "Member", key: "member", width: 26 },
          { header: "Category", key: "category", width: 24 },
          { header: "Status", key: "status", width: 14 },
          { header: "Check-in Time", key: "checkedInAt", type: "datetime", width: 20 },
          { header: "Correction Reason", key: "correction", width: 30 },
        ],
        rows,
      },
    ];
  },
};

const roster: ExportDataset = {
  key: "roster",
  title: "Roster",
  scope: (a) => chapterScope(a, "roster:manage"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const [assignments, rosters] = await Promise.all([
      db.rosterAssignment.findMany({
        where: chapterId ? { chapterId } : {},
        include: { chapter: true, role: true, member: { select: { name: true } } },
        orderBy: [{ chapter: { name: "asc" } }, { role: { order: "asc" } }],
      }),
      db.roster.findMany({
        where: chapterId ? { meeting: { chapterId } } : {},
        include: {
          meeting: { include: { chapter: true } },
          scores: { include: { member: { select: { name: true } } }, orderBy: { order: "asc" } },
        },
        orderBy: { meeting: { startsAt: "desc" } },
      }),
    ]);
    return [
      {
        name: "Roster Roles",
        columns: [
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Group", key: "group", width: 14 },
          { header: "Role", key: "role", width: 28 },
          { header: "Member", key: "member", width: 26 },
        ],
        rows: assignments.map((a) => ({ chapter: a.chapter.name, group: a.group, role: a.role.label, member: a.member.name })),
      },
      {
        name: "Roster Scores",
        columns: [
          { header: "Meeting Date", key: "date", type: "date", width: 14 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Saved", key: "saved", type: "datetime", width: 20 },
          { header: "Position", key: "position", type: "number" },
          { header: "Member", key: "member", width: 26 },
          { header: "Score", key: "score", type: "number" },
          { header: "App Points", key: "points", type: "number" },
        ],
        rows: rosters.flatMap((r) =>
          r.scores.map((s, i) => ({
            date: r.meeting.startsAt,
            meeting: r.meeting.title,
            chapter: r.meeting.chapter.name,
            saved: r.savedAt,
            position: i + 1,
            member: s.member.name,
            score: s.score,
            points: s.systemPoints,
          })),
        ),
      },
    ];
  },
};

type InvitationGuest = { name?: string; designation?: string; organisation?: string };

const invitations: ExportDataset = {
  key: "invitations",
  title: "Meeting Invitations",
  scope: (a) => chapterScope(a, "invitations:manage"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const rows = await db.meetingInvitation.findMany({
      where: chapterId ? { meeting: { chapterId } } : {},
      include: { meeting: { include: { chapter: true } } },
      orderBy: { meeting: { startsAt: "desc" } },
    });
    return [
      {
        name: "Invitations",
        columns: [
          { header: "Meeting Date", key: "date", type: "date", width: 14 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Heading", key: "heading", width: 40 },
          { header: "Chief Guests", key: "guests", width: 40 },
          { header: "Date Text", key: "dateLabel", width: 18 },
          { header: "Time Text", key: "timeLabel", width: 16 },
          { header: "Venue Text", key: "venue", width: 26 },
          { header: "Fee", key: "fee", width: 16 },
          { header: "Contact Phones", key: "phones", width: 26 },
          { header: "Last Saved", key: "updated", type: "datetime", width: 20 },
        ],
        rows: rows.map((inv) => {
          const guests = Array.isArray(inv.guests) ? (inv.guests as InvitationGuest[]) : [];
          const guestText = guests.length
            ? guests.map((g) => [g.name, g.designation, g.organisation].filter(Boolean).join(", ")).join("\n")
            : [inv.guestName, inv.guestDesignation, inv.guestOrganisation].filter(Boolean).join(", ");
          return {
            date: inv.meeting.startsAt,
            meeting: inv.meeting.title,
            chapter: inv.meeting.chapter.name,
            heading: `${inv.headingLine1} — ${inv.headingLine2}`,
            guests: guestText,
            dateLabel: inv.dateLabel,
            timeLabel: inv.timeLabel,
            venue: inv.venueLabel,
            fee: inv.isComplimentary ? "Complimentary" : inv.feeLabel,
            phones: inv.contactPhones,
            updated: inv.updatedAt,
          };
        }),
      },
    ];
  },
};

export const MEETING_DATASETS = [meetings, attendance, roster, invitations];
