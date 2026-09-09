import { db } from "@/lib/db";

/**
 * Client correction spec (2026-09-09) §30 — chapter cards need an "available
 * categories" signal, not just the full list the chapter detail page already
 * shows. Same occupied-category logic as that detail page
 * (src/app/(public)/chapters/[slug]/page.tsx), just batched across every
 * chapter in one query instead of one call per card (avoids an N+1 on the
 * chapters listing / homepage grid).
 */
export async function getOpenCategoryCounts(chapterIds: string[]): Promise<Map<string, number>> {
  const [totalActiveCategories, members] = await Promise.all([
    db.category.count({ where: { isActive: true } }),
    db.member.findMany({
      where: { status: "ACTIVE", chapterId: { in: chapterIds } },
      select: { chapterId: true, categoryId: true },
    }),
  ]);

  const occupiedByChapter = new Map<string, Set<string>>();
  for (const m of members) {
    if (!occupiedByChapter.has(m.chapterId)) occupiedByChapter.set(m.chapterId, new Set());
    occupiedByChapter.get(m.chapterId)!.add(m.categoryId);
  }

  return new Map(chapterIds.map((id) => [id, totalActiveCategories - (occupiedByChapter.get(id)?.size ?? 0)]));
}
