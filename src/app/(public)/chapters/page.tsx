import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export default async function ChaptersPage() {
  const chapters = await db.chapter.findMany({
    where: { status: "ACTIVE" },
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });

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

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/chapters/${chapter.slug}`}
              className="group overflow-hidden rounded-sm border border-navy-700"
            >
              <MediaPlaceholder brief={`${chapter.name} — meeting venue or member work`} className="aspect-[4/3]" />
              <div className="bg-navy-800 p-5">
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
