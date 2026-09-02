/**
 * Category exclusivity (brief §15 — CRITICAL): at most one ACTIVE member per
 * (chapter, category) pair. Enforced by a unique constraint on
 * Member.activeSlotKey — see the field's doc comment in schema.prisma for
 * why this computed-column pattern is used instead of a partial index.
 *
 * Always derive activeSlotKey through this function rather than constructing
 * it inline, so every call site agrees on the exact format.
 */
export function computeActiveSlotKey(
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
  chapterId: string,
  categoryId: string,
): string | null {
  return status === "ACTIVE" ? `${chapterId}:${categoryId}` : null;
}

/** Prisma throws P2002 on the activeSlotKey unique constraint — this turns that into a message a form can show. */
export const SLOT_TAKEN_ERROR = "This category is already occupied by an active member in this chapter.";
