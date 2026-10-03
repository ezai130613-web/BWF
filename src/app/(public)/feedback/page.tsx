import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { FeedbackForm } from "@/components/marketing/feedback-form";

// The meeting list is time-relative (last 60 days / next week) — refresh
// hourly, same ceiling as the rest of the public site.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Feedback",
  description: "Share feedback with Builders World Forum management.",
};

export default async function FeedbackPage() {
  // Meetings from the last 60 days plus the next week — "which meeting did
  // you attend?". Members are name-only (no contact data in the public
  // payload — same rule as /visit since Phase 29).
  const now = new Date().getTime();
  const [chapters, meetings, members] = await Promise.all([
    db.chapter.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.meeting.findMany({
      where: {
        status: { not: "CANCELLED" },
        chapter: { status: "ACTIVE" },
        startsAt: { gte: new Date(now - 60 * 24 * 60 * 60 * 1000), lte: new Date(now + 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, chapterId: true, title: true, startsAt: true },
      orderBy: { startsAt: "desc" },
    }),
    db.member.findMany({
      where: { status: "ACTIVE", chapter: { status: "ACTIVE" } },
      select: { id: true, name: true, chapterId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const meetingOptions = meetings.map((m) => ({
    id: m.id,
    chapterId: m.chapterId,
    label: `${m.startsAt.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })} — ${m.title}`,
  }));

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Feedback</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">
          Tell us what&rsquo;s on your mind.
        </h1>
        <p className="mt-4 text-slate-400">
          Meeting feedback, event feedback, or anything for BWF management — this goes straight
          to the team, not published anywhere.
        </p>
        <div className="mt-10">
          <FeedbackForm chapters={chapters} meetings={meetingOptions} members={members} />
        </div>
      </Container>
    </div>
  );
}
