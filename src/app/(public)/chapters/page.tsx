import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { getChapterPhotos } from "@/lib/chapters/photos";
import { getOpenCategoryCounts } from "@/lib/chapters/availability";
import { MeetingAttendees } from "@/components/chapters/meeting-attendees";
import { MeetingTimeline } from "@/components/chapters/meeting-timeline";
import { Terminology } from "@/components/chapters/terminology";
import { MeetingComparison } from "@/components/chapters/meeting-comparison";
import { WhyMeetRegularly } from "@/components/chapters/why-meet-regularly";
import { AttendanceMeter } from "@/components/chapters/attendance-meter";
import { VisitorCategories } from "@/components/chapters/visitor-categories";
import { MeetingCharges } from "@/components/chapters/meeting-charges";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

export default async function ChaptersPage() {
  const unsortedChapters = await db.chapter.findMany({
    where: { status: { in: ["ACTIVE", "COMING_SOON"] } },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });
  // Postgres appends new enum values at the end of the type regardless of
  // where they're declared in schema.prisma (ADD VALUE has no BEFORE/AFTER
  // here), so `orderBy: { status: "desc" }` doesn't reliably put ACTIVE
  // before COMING_SOON — sort explicitly instead.
  const chapters = [...unsortedChapters].sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1));
  const openCategoryCounts = await getOpenCategoryCounts(
    chapters.filter((c) => c.status === "ACTIVE").map((c) => c.id),
  );

  return (
    <div>
      <div className="py-24">
        <Container>
          <SectionLabel>Chapters</SectionLabel>
          <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
            What Happens Inside a BWF Meeting?
          </h1>
          <p className="mt-4 max-w-xl text-slate-400">
            Every BWF meeting brings together three important groups —{" "}
            <span className="text-ivory-100">Members + Visitors + Chief Guests</span> — creating a
            structured environment for networking, referrals, learning and business opportunities.
          </p>
        </Container>
      </div>

      <MeetingAttendees />
      <MeetingTimeline />
      <Terminology />
      <MeetingComparison />
      <WhyMeetRegularly />
      <AttendanceMeter />
      <VisitorCategories />
      <MeetingCharges />

      <div className="bg-emerald-800 py-24">
        <Container>
          <SectionLabel>Chapters</SectionLabel>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/chapters/${chapter.slug}`}
                className="group overflow-hidden rounded-sm border border-emerald-600 bg-emerald-900"
              >
                <PhotoSlot
                  src={getChapterPhotos(chapter.slug)?.card}
                  alt={chapter.name}
                  brief={`${chapter.name} — meeting venue or member work`}
                  unoptimized={false}
                  className="aspect-[4/3]"
                />
                <div className="p-5">
                  {chapter.status === "COMING_SOON" ? (
                    <span className="mb-2 inline-block rounded-full border border-gold-500/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gold-400">
                      Launching Soon
                    </span>
                  ) : null}
                  <p className="font-display text-xl text-ivory-100">{chapter.name}</p>
                  {chapter.status === "ACTIVE" ? (
                    <p className="mt-1 text-sm text-slate-400">
                      {chapter.location ?? "Chennai"} · {chapter._count.members}{" "}
                      {chapter._count.members === 1 ? "member" : "members"}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">{chapter.location ?? "Chennai"}</p>
                  )}
                  {chapter.meetingSchedule ? (
                    <p className="mt-1 text-sm text-slate-400">{chapter.meetingSchedule}</p>
                  ) : null}
                  {chapter.status === "ACTIVE" ? (
                    <p className="mt-1 text-sm text-gold-400">
                      {openCategoryCounts.get(chapter.id) ?? 0} categories open
                    </p>
                  ) : null}
                  <span className="mt-3 inline-block text-sm font-medium text-gold-400 transition-transform group-hover:translate-x-1">
                    {chapter.status === "COMING_SOON" ? "Learn More →" : "Explore Chapter →"}
                  </span>
                </div>
              </Link>
            ))}
            {chapters.length === 0 ? (
              <p className="text-slate-400">No chapters are publicly listed yet.</p>
            ) : null}
          </div>
        </Container>
      </div>
    </div>
  );
}
