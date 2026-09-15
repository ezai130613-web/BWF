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

/**
 * Phase 20 Batch 3 — Roster Sheet's final page needs the actual open
 * category *names* for one chapter (the reference PDFs' "Open Categories"
 * list), not just the count getOpenCategoryCounts() returns. Same live
 * occupied-category query the chapter detail page already uses.
 */
export async function getOpenCategoryNames(chapterId: string): Promise<string[]> {
  const [allActive, occupied] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.member.findMany({ where: { status: "ACTIVE", chapterId }, select: { categoryId: true } }),
  ]);

  const occupiedIds = new Set(occupied.map((m) => m.categoryId));
  return allActive.filter((c) => !occupiedIds.has(c.id)).map((c) => c.name);
}
