import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { VisitorRegisterForm } from "@/components/marketing/visitor-register-form";

async function getMeeting(meetingId: string) {
  return db.meeting.findUnique({ where: { id: meetingId }, include: { chapter: true } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}): Promise<Metadata> {
  const { meetingId } = await params;
  const meeting = await getMeeting(meetingId);
  if (!meeting) return {};
  return { title: `Register to visit — ${meeting.title}` };
}

export default async function VisitMeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.chapter.status !== "ACTIVE") notFound();

  const [categories, members] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.member.findMany({
      where: { chapterId: meeting.chapterId, status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const closed = meeting.status !== "SCHEDULED" || !meeting.visitorRegistrationEnabled;

  return (
    <div className="py-24">
      <Container className="max-w-2xl">
        <SectionLabel>Visit a meeting</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">{meeting.title}</h1>
        <p className="mt-2 text-slate-400">
          {meeting.chapter.name} · {meeting.startsAt.toLocaleString()}
        </p>
        {meeting.venue ? <p className="mt-1 text-sm text-slate-500">{meeting.venue}</p> : null}

        <div className="mt-12">
          {closed ? (
            <div className="rounded-sm border border-navy-700 p-8 text-center">
              <p className="text-slate-300">
                Online registration for this meeting is currently closed. Please contact the
                chapter directly if you&rsquo;d like to attend.
              </p>
            </div>
          ) : (
            <VisitorRegisterForm
              categories={categories}
              members={members}
              meetingId={meeting.id}
              fixedChapter={{ id: meeting.chapter.id, name: meeting.chapter.name }}
            />
          )}
        </div>
      </Container>
    </div>
  );
}
