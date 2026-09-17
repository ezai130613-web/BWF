import { notFound } from "next/navigation";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CheckinForm } from "@/components/checkin/checkin-form";

/**
 * QR Code / Attendance / Payment system (2026-09-17) — the member-facing
 * end of the flow. Chapter and meeting are fixed by the QR token itself
 * (spec: "members must not select either manually"); identity is the
 * signed-in member's own session (see the schema comment above the
 * Attendance model for why this replaces the spec's literal "searchable
 * dropdown" step) — this page never asks the member to type their name or
 * pick their category.
 */
export default async function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const meeting = await db.meeting.findUnique({ where: { attendanceQrToken: token }, include: { chapter: true } });
  if (!meeting) notFound();

  const { member } = await requireMemberProfile();
  const memberWithCategory = await db.member.findUniqueOrThrow({
    where: { id: member.id },
    include: { category: true, chapter: true },
  });

  const existingAttendance = await db.attendance.findUnique({
    where: { meetingId_memberId: { meetingId: meeting.id, memberId: member.id } },
  });

  const now = new Date();
  const withinWindow =
    (!meeting.checkInOpensAt || now >= meeting.checkInOpensAt) && (!meeting.checkInClosesAt || now <= meeting.checkInClosesAt);
  const registrationClosed = !meeting.attendanceRegistrationOpen || !withinWindow;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Meeting Check-In</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {meeting.title} — {meeting.chapter.name}
        </p>
        <p className="text-sm text-neutral-500">
          {meeting.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Name</dt>
            <dd className="font-medium text-neutral-900">{memberWithCategory.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Category</dt>
            <dd className="font-medium text-neutral-900">{memberWithCategory.category.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Chapter</dt>
            <dd className="font-medium text-neutral-900">{memberWithCategory.chapter.name}</dd>
          </div>
        </dl>
      </div>

      {registrationClosed ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
          Check-in for this meeting isn&rsquo;t open right now. Please check with your chapter admin.
        </div>
      ) : existingAttendance?.status === "PRESENT" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
          <p>You&rsquo;re already checked in as Present for this meeting.</p>
          <p className="mt-1 text-emerald-700">
            Made a payment since? You can still submit it below — it won&rsquo;t create a duplicate check-in.
          </p>
          <div className="mt-4">
            <CheckinForm token={token} alreadyPresent numberOfMonthsOptions={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]} />
          </div>
        </div>
      ) : (
        <CheckinForm token={token} alreadyPresent={false} numberOfMonthsOptions={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]} />
      )}
    </div>
  );
}
