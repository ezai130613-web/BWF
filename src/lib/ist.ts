/**
 * India Standard Time helpers (UTC+05:30, no DST). Chapter meetings are
 * scheduled in Chennai wall-clock time; computing them through the server's
 * own timezone would silently shift every date once deployed to a UTC host
 * (Vercel), so new date logic converts explicitly.
 */

export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** UTC instant for a given IST wall-clock date/time. `month` is 0-based. */
export function istToUtc(year: number, month: number, day: number, hours = 0, minutes = 0): Date {
  return new Date(Date.UTC(year, month, day, hours, minutes) - IST_OFFSET_MS);
}

/** The IST calendar parts of a UTC instant. `month` is 0-based, `weekday` 0 = Sunday. */
export function istParts(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** [start, end) of the IST calendar day containing `date`, as UTC instants. */
export function istDayRange(date: Date): [Date, Date] {
  const { year, month, day } = istParts(date);
  return [istToUtc(year, month, day), istToUtc(year, month, day + 1)];
}

export function formatIst(date: Date, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleString("en-IN", { ...options, timeZone: IST_TIME_ZONE });
}

/** "Wed, 5 Nov 2026, 7:00 am" */
export function formatIstDateTime(date: Date) {
  return formatIst(date, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Parses "HH:mm" (24h). Returns null for anything else. */
export function parseTimeOfDay(value: string | null | undefined): { hours: number; minutes: number } | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value?.trim() ?? "");
  return match ? { hours: Number(match[1]), minutes: Number(match[2]) } : null;
}

/** "2026-11-12T07:00" (an <input type="datetime-local"> value, entered in IST) → UTC instant. */
export function parseIstDateTimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  return istToUtc(y, mo - 1, d, h, mi);
}

/** UTC instant → "2026-11-12T07:00" in IST, for a datetime-local input's value. */
export function toIstDateTimeLocal(date: Date): string {
  const p = istParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}`;
}
