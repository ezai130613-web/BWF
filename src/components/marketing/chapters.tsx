import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { getChapterPhotos } from "@/lib/chapters/photos";
import { getOpenCategoryCounts } from "@/lib/chapters/availability";

export async function Chapters() {
  const unsortedChapters = await db.chapter.findMany({
    where: { status: { in: ["ACTIVE", "COMING_SOON"] } },
    orderBy: { name: "asc" },
  });

  if (unsortedChapters.length === 0) return null;

  // Postgres appends new enum values at the end of the type regardless of
  // where they're declared in schema.prisma, so orderBy on `status` alone
  // doesn't reliably put ACTIVE before COMING_SOON — sort explicitly.
  const chapters = [...unsortedChapters].sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1));

  const openCategoryCounts = await getOpenCategoryCounts(
    chapters.filter((c) => c.status === "ACTIVE").map((c) => c.id),
  );

  return (
    <section className="bg-emerald-900 py-28">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <SectionLabel number="03">Chapters</SectionLabel>
        </div>

        <div className="mt-10 flex snap-x gap-6 overflow-x-auto pb-4">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/chapters/${chapter.slug}`}
              className="group relative w-[80vw] flex-shrink-0 snap-start overflow-hidden rounded-sm border border-emerald-700 sm:w-[60vw] lg:w-[calc((100%-3rem)/3)]"
            >
              <PhotoSlot
                src={getChapterPhotos(chapter.slug)?.portrait}
                alt={chapter.name}
                brief={`${chapter.name} — chapter meeting venue or member work, photographic`}
                unoptimized={false}
                className="aspect-[4/5]"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent p-6">
                {chapter.status === "COMING_SOON" ? (
                  <span className="mb-2 inline-block w-fit rounded-full border border-gold-500/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gold-400">
                    Launching Soon
                  </span>
                ) : null}
                <p className="font-display text-2xl text-ivory-100">{chapter.name}</p>
                <p className="mt-1 text-sm text-slate-400">{chapter.location ?? "Chennai"}</p>
                {chapter.status === "ACTIVE" ? (
                  <p className="mt-1 text-sm text-gold-400">
                    {openCategoryCounts.get(chapter.id) ?? 0} categories open
                  </p>
                ) : null}
                <span className="mt-4 text-sm font-medium text-gold-400 transition-transform group-hover:translate-x-1">
                  {chapter.status === "COMING_SOON" ? "Learn More →" : "Explore Chapter →"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
