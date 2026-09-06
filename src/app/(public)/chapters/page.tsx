import Link from "next/link";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { getChapterPhotos } from "@/lib/chapters/photos";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

export default async function ChaptersPage() {
  const chapters = await db.chapter.findMany({
    where: { status: "ACTIVE" },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });

  const content = await getContent(["meetings.intro", "meetings.details"]);
  const meetingDetails = content["meetings.details"]?.split("\n").filter(Boolean) ?? [];

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Chapters</SectionLabel>
        <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
          Where BWF meets.
        </h1>
        <p className="mt-4 max-w-xl text-slate-400">
          Each chapter builds its own concentrated network within Chennai — one member per
          category, per chapter.
        </p>

        {content["meetings.intro"] || meetingDetails.length > 0 ? (
          <div className="mt-16 border-y border-emerald-700/60 py-12">
            <SectionLabel>How BWF Meetings Work</SectionLabel>
            {content["meetings.intro"] ? (
              <p className="mt-4 max-w-none text-slate-300">{content["meetings.intro"]}</p>
            ) : null}
            {meetingDetails.length > 0 ? (
              <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {meetingDetails.map((line, i) => {
                  const [heading, ...rest] = line.split(":");
                  const detail = rest.join(":").trim();
                  return (
                    <div key={i}>
                      <p className="font-medium text-ivory-100">{heading}</p>
                      <p className="mt-1 text-sm text-slate-400">{detail}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/chapters/${chapter.slug}`}
              className="group overflow-hidden rounded-sm border border-emerald-700"
            >
              <PhotoSlot
                src={getChapterPhotos(chapter.slug)?.card}
                alt={chapter.name}
                brief={`${chapter.name} — meeting venue or member work`}
                unoptimized={false}
                className="aspect-[4/3]"
              />
              <div className="bg-emerald-800 p-5">
                <p className="font-display text-xl text-ivory-100">{chapter.name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {chapter.location ?? "Chennai"} · {chapter._count.members}{" "}
                  {chapter._count.members === 1 ? "member" : "members"}
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-gold-400 transition-transform group-hover:translate-x-1">
                  Explore Chapter →
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
  );
}
