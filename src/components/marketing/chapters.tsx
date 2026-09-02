import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export async function Chapters() {
  const chapters = await db.chapter.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  if (chapters.length === 0) return null;

  return (
    <section className="bg-navy-900 py-28">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <SectionLabel number="03">Chapters</SectionLabel>
        </div>

        <div className="mt-10 flex snap-x gap-6 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/chapters/${chapter.slug}`}
              className="group relative w-[80vw] flex-shrink-0 snap-start overflow-hidden rounded-sm border border-navy-700 sm:w-[60vw] lg:w-auto"
            >
              <MediaPlaceholder
                brief={`${chapter.name} — chapter meeting venue or member work, photographic`}
                className="aspect-[4/5]"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent p-6">
                <p className="font-display text-2xl text-ivory-100">{chapter.name}</p>
                <p className="mt-1 text-sm text-slate-400">{chapter.location ?? "Chennai"}</p>
                <span className="mt-4 text-sm font-medium text-gold-400 transition-transform group-hover:translate-x-1">
                  Explore Chapter →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
