import Link from "next/link";
import { notFound } from "next/navigation";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { generateAttendanceToken, getVisitorCheckinUrl } from "@/lib/attendance/qr";
import { setVisitorCheckinOpen } from "./actions";
import { PrintButton } from "@/components/admin/print-button";

async function getMeetingWithToken(meetingId: string) {
  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return null;

  // Generated once, on first view — "reopening the meeting must retrieve
  // its existing QR rather than create a replacement" (spec).
  if (!meeting.visitorAttendanceQrToken) {
    return db.meeting.update({ where: { id: meetingId }, data: { visitorAttendanceQrToken: generateAttendanceToken() } });
  }
  return meeting;
}

export default async function VisitorsQrMeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;

  const bareMeeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!bareMeeting) notFound();
  await requireChapterAccess(bareMeeting.chapterId, "attendance:manage");

  const meeting = await getMeetingWithToken(meetingId);
  if (!meeting?.visitorAttendanceQrToken) notFound();

  const checkinUrl = getVisitorCheckinUrl(meeting.visitorAttendanceQrToken);
  const qrImageUrl = `/api/admin/qr-codes/visitor/${meeting.id}`;

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print-area, #qr-print-area * { visibility: visible; }
          #qr-print-area { position: fixed; inset: 0; border: none; }
        }
      `}</style>
      <div>
        <Link href="/admin/visitors-qr" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to Visitors QR
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {meeting.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div id="qr-print-area" className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-white p-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- server-rendered PNG from our own API route, not a next/image-managed asset */}
          <img src={qrImageUrl} alt="Visitor check-in QR code" className="h-64 w-64" />
          <p className="text-center text-sm text-neutral-600">{meeting.title} — Visitor Check-In</p>
          <div className="flex flex-wrap items-center justify-center gap-2 print:hidden">
            <a
              href={`${qrImageUrl}?download=1`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
            >
              Download
            </a>
            <PrintButton />
            <a
              href={checkinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
            >
              Open Registration Link
            </a>
          </div>
          <p className="break-all text-center text-xs text-neutral-400 print:hidden">{checkinUrl}</p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Registration</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Currently{" "}
              <span className={meeting.visitorCheckInOpen ? "font-medium text-emerald-700" : "font-medium text-neutral-500"}>
                {meeting.visitorCheckInOpen ? "Open" : "Closed"}
              </span>
              . Visitors can only register/check in while this is Open.
            </p>
            <div className="mt-4 flex gap-2">
              <form action={setVisitorCheckinOpen.bind(null, meeting.id, true)}>
                <button
                  type="submit"
                  disabled={meeting.visitorCheckInOpen}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Open Registration
                </button>
              </form>
              <form action={setVisitorCheckinOpen.bind(null, meeting.id, false)}>
                <button
                  type="submit"
                  disabled={!meeting.visitorCheckInOpen}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Close Registration
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
