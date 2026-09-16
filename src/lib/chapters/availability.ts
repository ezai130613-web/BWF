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
 * categories for one chapter (the reference PDFs' "Open Categories" list),
 * not just the count getOpenCategoryCounts() returns. Same live
 * occupied-category query the chapter detail page already uses.
 *
 * Returns full {id, name} objects — the 2026-09-16 interactive Roster
 * wizard needs the id to build its Select Open Categories checklist
 * (src/lib/roster/manage.ts) and to save the admin's chosen subset against
 * a specific meeting's Roster; getOpenCategoryNames() below is just this
 * mapped down to names for generate.ts's live-candidate use.
 */
export async function getOpenCategories(chapterId: string): Promise<{ id: string; name: string }[]> {
  const [allActive, occupied] = await Promise.all([
    // Roster correction (2026-09-15): `isActive` alone was pulling in every
    // near-duplicate/legacy category row the taxonomy had accumulated
    // (204 active rows, most reference chapters only meant ~30-45 to ever
    // show here). `showInOpenCategories` is the admin-curated subset
    // (`/admin/categories`) actually eligible for this list — separate
    // from `isActive`, which still governs everything else (new
    // applications, member profile category, etc).
    db.category.findMany({ where: { isActive: true, showInOpenCategories: true }, orderBy: { name: "asc" } }),
    db.member.findMany({ where: { status: "ACTIVE", chapterId }, select: { categoryId: true } }),
  ]);

  const occupiedIds = new Set(occupied.map((m) => m.categoryId));
  return allActive.filter((c) => !occupiedIds.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
}

export async function getOpenCategoryNames(chapterId: string): Promise<string[]> {
  const open = await getOpenCategories(chapterId);
  return open.map((c) => c.name);
}
