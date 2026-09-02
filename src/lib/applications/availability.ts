import { db } from "@/lib/db";

export type ChapterAvailability = {
  chapterId: string;
  chapterName: string;
  location: string | null;
  available: boolean;
};

/**
 * Category-availability check (brief §16) — one row per ACTIVE chapter,
 * `available: false` wherever that chapter already has an ACTIVE member in
 * this category. Reuses the same Member.activeSlotKey pairs the exclusivity
 * constraint itself is built on (see src/lib/members/slot.ts), so this can
 * never drift out of sync with what the database actually enforces.
 */
export async function getChapterAvailability(categoryId: string): Promise<ChapterAvailability[]> {
  const chapters = await db.chapter.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  const occupied = await db.member.findMany({
    where: { status: "ACTIVE", categoryId },
    select: { chapterId: true },
  });
  const occupiedChapterIds = new Set(occupied.map((m) => m.chapterId));

  return chapters.map((chapter) => ({
    chapterId: chapter.id,
    chapterName: chapter.name,
    location: chapter.location,
    available: !occupiedChapterIds.has(chapter.id),
  }));
}
