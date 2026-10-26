export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "14 March" — same as the website's formatBirthday(). */
export function formatBirthday(day: number, month: number) {
  return `${day} ${MONTH_NAMES[month - 1]}`;
}
