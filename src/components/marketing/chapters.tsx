import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

/**
 * Real chapter names/locations aren't finalized yet (see docs/ARCHITECTURE.md
 * open decisions) — these are intentionally generic placeholders, not
 * fabricated data. Phase 3 replaces this static list with chapters queried
 * from the database.
 */
const CHAPTERS = [
  { label: "Chapter 01", location: "Chennai" },
  { label: "Chapter 02", location: "Chennai" },
  { label: "Chapter 03", location: "Chennai" },
];

export function Chapters() {
  return (
    <section className="bg-navy-900 py-28">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <SectionLabel number="03">Chapters</SectionLabel>
        </div>

        <div className="mt-10 flex snap-x gap-6 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {CHAPTERS.map((chapter) => (
            <a
              key={chapter.label}
              href="/chapters"
              className="group relative w-[80vw] flex-shrink-0 snap-start overflow-hidden rounded-sm border border-navy-700 sm:w-[60vw] lg:w-auto"
            >
              <MediaPlaceholder
                brief={`${chapter.label} — chapter meeting venue or member work, photographic`}
                className="aspect-[4/5]"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent p-6">
                <p className="font-display text-2xl text-ivory-100">{chapter.label}</p>
                <p className="mt-1 text-sm text-slate-400">{chapter.location}</p>
                <span className="mt-4 text-sm font-medium text-gold-400 transition-transform group-hover:translate-x-1">
                  Explore Chapter →
                </span>
              </div>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
}
