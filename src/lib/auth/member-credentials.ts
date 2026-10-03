import { db } from "@/lib/db";

/**
 * Bulk temporary member credentials (2026-10-03, simplified at the client's
 * request the same day). Usernames are per chapter — "BWFCC" + chapter
 * number + a 2-digit sequence: Chapter 01 → BWFCC101, BWFCC102 …, Chapter 02
 * → BWFCC201 … — continuing from the highest already issued in that chapter.
 *
 * Every temporary password is the same short value, by client decision, so
 * credentials are easy to hand out. Accepted trade-off: until a member
 * finishes first-login activation (verify email + set a private password of
 * 12+ characters), anyone who knows their username can sign in as them —
 * activation should happen promptly after distribution. Only the Argon2id
 * hash is stored, as for every other password.
 */

export const TEMPORARY_PASSWORD = "1234";
export const USERNAME_PREFIX = "BWFCC";

/** "Chapter 01" → 1. Falls back to the chapter's position by creation date. */
async function chapterNumbers(chapterIds: string[]): Promise<Map<string, number>> {
  const chapters = await db.chapter.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const map = new Map<string, number>();
  chapters.forEach((c, i) => {
    const n = Number(/\d+/.exec(c.name)?.[0]);
    map.set(c.id, Number.isInteger(n) && n > 0 ? n : i + 1);
  });
  return new Map(chapterIds.map((id) => [id, map.get(id) ?? 0]));
}

/** Next usernames for the given members (in order), numbered within each member's chapter. */
export async function assignUsernames(members: { id: string; chapterId: string }[]): Promise<Map<string, string>> {
  const numbers = await chapterNumbers([...new Set(members.map((m) => m.chapterId))]);
  const existing = await db.user.findMany({ where: { username: { startsWith: USERNAME_PREFIX } }, select: { username: true } });

  const nextSeq = new Map<number, number>();
  for (const n of new Set(numbers.values())) {
    const prefix = `${USERNAME_PREFIX}${n}`;
    const highest = existing.reduce((max, u) => {
      const rest = u.username!.slice(prefix.length);
      return u.username!.startsWith(prefix) && /^\d{2,}$/.test(rest) ? Math.max(max, Number(rest)) : max;
    }, 0);
    nextSeq.set(n, highest + 1);
  }

  const result = new Map<string, string>();
  for (const m of members) {
    const n = numbers.get(m.chapterId)!;
    const seq = nextSeq.get(n)!;
    nextSeq.set(n, seq + 1);
    result.set(m.id, `${USERNAME_PREFIX}${n}${String(seq).padStart(2, "0")}`);
  }
  return result;
}
