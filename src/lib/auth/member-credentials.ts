import { randomInt } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Bulk temporary member credentials (2026-10-03, simplified at the client's
 * request the same day). Usernames are per chapter — "BWFCC" + chapter
 * number + a 2-digit sequence: Chapter 01 → BWFCC101, BWFCC102 …, Chapter 02
 * → BWFCC201 … — continuing from the highest already issued in that chapter.
 *
 * Temporary passwords (2026-10-21, replacing the shared "1234"): one per
 * account, an easy word plus 4 digits ("mango-4821") — simple to read out or
 * type on a phone, but not guessable from the username pattern the way one
 * shared value was. Until a member finishes first-login activation (verify
 * email + set a private password of 12+ characters) the temporary password
 * is all that protects the account. Only the Argon2id hash is stored, as for
 * every other password; the plaintext is shown to the issuing admin once.
 */

export const USERNAME_PREFIX = "BWFCC";

const PASSWORD_WORDS = [
  "mango", "lotus", "river", "tiger", "maple", "cedar", "coral", "amber", "brick", "stone",
  "tower", "plaza", "bridge", "arch", "beam", "crane", "steel", "marble", "granite", "teak",
  "palm", "lemon", "olive", "pearl", "ruby", "jade", "eagle", "falcon", "otter", "panda",
  "cloud", "storm", "sunny", "harbor", "island", "garden", "meadow", "forest", "canyon", "summit",
  "rocket", "comet", "planet", "silver", "golden", "copper", "violet", "indigo", "saffron", "ginger",
];

/** A fresh temporary password: word + "-" + 4 digits, from a CSPRNG. */
export function generateTemporaryPassword(): string {
  const word = PASSWORD_WORDS[randomInt(PASSWORD_WORDS.length)];
  return `${word}-${String(randomInt(10000)).padStart(4, "0")}`;
}

/** Still on an auto-issued BWFCC### username — activation makes them choose their own. */
export function hasTemporaryUsername(username: string | null | undefined): boolean {
  return Boolean(username?.startsWith(USERNAME_PREFIX));
}

/**
 * A username the member chooses at activation: 4–30 letters/digits/./_/-, starting with a
 * letter. Stored upper-case like every username (loginLookup() upper-cases what's typed, so
 * sign-in is case-insensitive). No "@" — that would be read as an email at sign-in.
 */
export function normalizeChosenUsername(raw: string): { username: string } | { error: string } {
  const value = raw.trim();
  if (!/^[A-Za-z][A-Za-z0-9._-]{3,29}$/.test(value)) {
    return { error: "Username must be 4–30 characters: letters, numbers, . _ or -, starting with a letter." };
  }
  const username = value.toUpperCase();
  if (username.startsWith(USERNAME_PREFIX)) return { error: `Choose your own username — not one starting with "${USERNAME_PREFIX}".` };
  return { username };
}

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
