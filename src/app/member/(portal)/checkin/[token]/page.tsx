import { notFound } from "next/navigation";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { isWithinCheckinWindow } from "@/lib/attendance/qr";
import { CheckinForm } from "@/components/checkin/checkin-form";
import { checkAttendancePayment, formatDateKey, istDateKey, meetingCoverageFor } from "@/lib/payments/coverage";
import { getBooleanSetting } from "@/lib/settings";
import Link from "next/link";

/**
 * QR Code / Attendance / Payment system (2026-09-17) — the member-facing
 * end of the flow. Chapter and meeting are fixed by the QR token itself
 * (spec: "members must not select either manually"); identity is the
 * signed-in member's own session (see the schema comment above the
 * Attendance model for why this replaces the spec's literal "searchable
 * dropdown" step) — this page never asks the member to type their name or
 * pick their category.
 *
 * Phase 40 — attendance only; payment happens on /member/payments.
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

  // 2026-11-03 — payments cover specific meeting dates. With "attendance
  // requires payment" on, an unpaid member is told why before trying.
  const coverage = await meetingCoverageFor(member.id, meeting.startsAt);
  const monthLabel = `the meeting on ${formatDateKey(istDateKey(meeting.startsAt))}`;
  const paymentBlock =
    existingAttendance?.status !== "PRESENT" && (await getBooleanSetting("attendance.requirePayment"))
      ? await checkAttendancePayment(member.id, meeting.startsAt)
      : null;

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
          ✓ Your meeting fee for <span className="font-medium">{monthLabel}</span> is paid.
        </div>
      ) : coverage === "PENDING" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your payment covering <span className="font-medium">{monthLabel}</span> is awaiting BWF approval.
        </div>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Your meeting fee for <span className="font-medium">{monthLabel}</span> isn&rsquo;t paid yet.{" "}
          <Link href="/member/payments" className="font-semibold underline">
            Pay now on the Payments page
          </Link>
          .
        </div>
      )}

      {registrationClosed ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
          Check-in for this meeting isn&rsquo;t open right now. Please check with your chapter admin.
        </div>
      ) : paymentBlock && !paymentBlock.ok ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-semibold">You can&rsquo;t check in yet.</p>
          <p className="mt-1">{paymentBlock.error}</p>
          <Link href="/member/payments" className="mt-3 inline-block rounded-lg bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-700">
            Go to Payments
          </Link>
        </div>
      ) : existingAttendance?.status === "PRESENT" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
          ✓ You&rsquo;re checked in as Present for this meeting.
        </div>
      ) : (
        <CheckinForm token={token} monthPaid={coverage !== null} monthLabel={monthLabel} />
      )}
    </div>
  );
}
