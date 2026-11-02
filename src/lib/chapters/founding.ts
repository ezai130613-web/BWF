import { db } from "@/lib/db";

/**
 * Founder/Co-Founder are BWF's own founding roles, the same two people on
 * every chapter (client, 2026-11-02) — see the Founding Members table on
 * /admin/chapters/[id] and the roster PDF's founding band. They're fixed in
 * the admin UI, so a new chapter gets them here instead, copied from the
 * oldest ACTIVE chapter that has them. A ChapterLeadership row may point at
 * a member of another chapter; the roster queries go by the row's chapterId.
 */
const FOUNDING_ROLE_KEYS = ["FOUNDER", "CO_FOUNDER"];

export async function addFoundingTeam(chapterId: string) {
  const source = await db.chapter.findFirst({
    where: { id: { not: chapterId }, status: "ACTIVE", leadership: { some: { role: { key: { in: FOUNDING_ROLE_KEYS } } } } },
    orderBy: { createdAt: "asc" },
    select: { leadership: { where: { role: { key: { in: FOUNDING_ROLE_KEYS } } }, select: { roleId: true, memberId: true } } },
  });
  if (!source) return;

  await db.chapterLeadership.createMany({
    data: source.leadership.map(({ roleId, memberId }) => ({ chapterId, roleId, memberId })),
    skipDuplicates: true,
  });
}
