/** Phase 37 — client-safe birthday constants/formatting (no database imports; see birthdays.ts for the rest). */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "14 March" — what other members see. */
export function formatBirthday(day: number, month: number) {
  return `${day} ${MONTH_NAMES[month - 1]}`;
}
