import { notFound } from "next/navigation";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { isWithinCheckinWindow } from "@/lib/attendance/qr";
import { CheckinForm } from "@/components/checkin/checkin-form";
import { formatMonthYear } from "@/lib/attendance/manage";
import { getMonthCoverage, meetingMonth } from "@/lib/payments/member-payments";
import Link from "next/link";

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

  // The meeting's month already paid for (e.g. a 6-month payment made
  // earlier) — skip the payment question once BWF has approved it.
  const month = meetingMonth(meeting.startsAt);
  const coverage = await getMonthCoverage(member.id, month);
  const monthLabel = formatMonthYear(month);

  const withinWindow = isWithinCheckinWindow(meeting);
  const registrationClosed = !meeting.attendanceRegistrationOpen || !withinWindow;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Meeting Check-In</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {meeting.title} — {meeting.chapter.name}
        </p>
        <p className="text-sm text-neutral-500">
          {meeting.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
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

      {coverage === "APPROVED" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your meeting payment for <span className="font-medium">{monthLabel}</span> is already paid and approved — no payment
          needed for this meeting.
        </div>
      ) : coverage === "PENDING" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A payment covering <span className="font-medium">{monthLabel}</span> is awaiting BWF approval. No need to submit it
          again — answer &ldquo;No&rdquo; below unless this is a new payment.
        </div>
      ) : null}

      {registrationClosed ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
          Check-in for this meeting isn&rsquo;t open right now. Please check with your chapter admin.
        </div>
      ) : existingAttendance?.status === "PRESENT" && coverage === "APPROVED" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
          <p>You&rsquo;re already checked in as Present for this meeting.</p>
          <p className="mt-1 text-emerald-700">
            Paying for other months or your annual membership?{" "}
            <Link href="/member/payments" className="font-medium underline">
              Go to Payments
            </Link>
          </p>
        </div>
      ) : existingAttendance?.status === "PRESENT" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
          <p>You&rsquo;re already checked in as Present for this meeting.</p>
          <p className="mt-1 text-emerald-700">
            Made a payment since? You can still submit it below — it won&rsquo;t create a duplicate check-in.
          </p>
          <div className="mt-4">
            <CheckinForm token={token} alreadyPresent startMonth={month} />
          </div>
        </div>
      ) : (
        <CheckinForm token={token} alreadyPresent={false} paymentCovered={coverage === "APPROVED"} startMonth={month} />
      )}
    </div>
  );
}
