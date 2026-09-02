import { db } from "@/lib/db";

/**
 * Reads one or more admin-editable content blocks (brief §62). Returns a
 * plain { key: value } map, using `fallback` for any key that's missing or
 * still null (e.g. before an admin has filled it in) — callers should
 * always handle the fallback case gracefully rather than assuming content
 * exists.
 */
export async function getContent(keys: string[]): Promise<Record<string, string | null>> {
  const rows = await db.websiteContent.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(keys.map((key) => [key, map.get(key) ?? null]));
}
