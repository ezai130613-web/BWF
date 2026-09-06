/**
 * Chapter has no photo field in the schema — chapters are BWF's own
 * curated imagery, sourced directly rather than filled in per-chapter by
 * an admin (see docs/ARCHITECTURE.md's Open Decisions). This is a plain
 * slug lookup into `public/images/chapters/` instead: a new chapter simply
 * has no entry here until its photos are sourced, and every call site
 * falls back to MediaPlaceholder when that happens.
 */
const CHAPTER_PHOTOS: Record<string, { portrait: string; card: string; hero: string }> = {
  "chapter-01": {
    portrait: "/images/chapters/chapter-01-portrait.jpg",
    card: "/images/chapters/chapter-01-card.jpg",
    hero: "/images/chapters/chapter-01-hero.jpg",
  },
  "chapter-02": {
    portrait: "/images/chapters/chapter-02-portrait.jpg",
    card: "/images/chapters/chapter-02-card.jpg",
    hero: "/images/chapters/chapter-02-hero.jpg",
  },
  "chapter-03": {
    portrait: "/images/chapters/chapter-03-portrait.jpg",
    card: "/images/chapters/chapter-03-card.jpg",
    hero: "/images/chapters/chapter-03-hero.jpg",
  },
};

export function getChapterPhotos(slug: string) {
  return CHAPTER_PHOTOS[slug];
}
