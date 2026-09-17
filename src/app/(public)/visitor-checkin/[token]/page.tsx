import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { VisitorCheckinForm } from "@/components/visitor-checkin/visitor-checkin-form";

/**
 * Visitor Management System (2026-09-18) — the public end of the flow. No
 * login: chapter and meeting are fixed by the QR token itself (spec:
 * "identifies chapter and meeting automatically"), identity comes entirely
 * from what the visitor types (name + phone), unlike the member check-in
 * page this mirrors (src/app/member/(portal)/checkin/[token]/page.tsx),
 * which reads identity from an existing session instead.
 */
export default async function VisitorCheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const meeting = await db.meeting.findUnique({ where: { visitorAttendanceQrToken: token }, include: { chapter: true } });
  if (!meeting) notFound();

  const members = await db.member.findMany({
    where: { chapterId: meeting.chapterId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl text-ivory-100">Visitor Check-In</h1>
        <p className="mt-1 text-sm text-slate-400">
          {meeting.title} — {meeting.chapter.name}
        </p>
        <p className="text-sm text-slate-500">
          {meeting.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      {!meeting.visitorCheckInOpen ? (
        <div className="rounded-sm border border-gold-500/40 p-6 text-center text-sm text-slate-400">
          Visitor check-in for this meeting isn&rsquo;t open right now. Please check with the BWF team.
        </div>
      ) : (
        <VisitorCheckinForm token={token} members={members} />
      )}
    </div>
  );
}
