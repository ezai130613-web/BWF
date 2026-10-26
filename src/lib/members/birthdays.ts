import { z } from "zod";
import { db } from "@/lib/db";
import { istParts } from "@/lib/ist";
import { fellowMemberScope } from "@/lib/members/visibility";
import { formatBirthday, MONTH_NAMES } from "@/lib/members/birthday-format";

export { formatBirthday, MONTH_NAMES };

/**
 * Phase 37 — member birthdays for the Socials page (portal + app). Stored as
 * day / month / optional year (see the Member model). Other members only
 * ever see day + month. "Today" is the IST calendar day.
 */

export type BirthdayValue = { day: number; month: number; year: number | null };

const MIN_YEAR = 1920;

function daysInMonth(month: number, year: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Form/JSON input → a validated birthday, `null` (all blank = clear it), or
 * an error. Accepts strings or numbers so FormData and JSON share it.
 */
export const birthdayInputSchema = z
  .object({
    day: z.union([z.string(), z.number()]).optional(),
    month: z.union([z.string(), z.number()]).optional(),
    year: z.union([z.string(), z.number()]).optional(),
  })
  .transform((raw, ctx): BirthdayValue | null => {
    const toInt = (v: string | number | undefined) => (v === undefined || v === "" ? null : Number(v));
    const day = toInt(raw.day);
    const month = toInt(raw.month);
    const year = toInt(raw.year);
    if (day === null && month === null && year === null) return null;
    if (day === null || month === null) {
      ctx.addIssue({ code: "custom", message: "Choose both the day and the month." });
      return z.NEVER;
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      ctx.addIssue({ code: "custom", message: "Choose a valid month." });
      return z.NEVER;
    }
    const thisYear = istParts(new Date()).year;
    if (year !== null && (!Number.isInteger(year) || year < MIN_YEAR || year > thisYear)) {
      ctx.addIssue({ code: "custom", message: `Year must be between ${MIN_YEAR} and ${thisYear}, or left blank.` });
      return z.NEVER;
    }
    // Without a year, allow 29 February (2000 is a leap year).
    if (!Number.isInteger(day) || day < 1 || day > daysInMonth(month, year ?? 2000)) {
      ctx.addIssue({ code: "custom", message: "That day doesn't exist in the chosen month." });
      return z.NEVER;
    }
    return { day, month, year };
  });

/** The raw day/month/year a birthday form submitted — echoed back on a validation error so the form keeps them. */
export type SubmittedBirthday = { day: string; month: string; year: string };

export function submittedBirthday(formData: FormData): SubmittedBirthday {
  const get = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v.trim() : "";
  };
  return { day: get("birthDay"), month: get("birthMonth"), year: get("birthYear") };
}

export function birthdayFields(value: BirthdayValue | null) {
  return { birthDay: value?.day ?? null, birthMonth: value?.month ?? null, birthYear: value?.year ?? null };
}

export function birthdayOf(member: { birthDay: number | null; birthMonth: number | null; birthYear: number | null }): BirthdayValue | null {
  return member.birthDay && member.birthMonth ? { day: member.birthDay, month: member.birthMonth, year: member.birthYear } : null;
}

/** "14 March 1985" / "14 March" — for the member themselves and admins. */
export function formatBirthdayFull(value: BirthdayValue | null) {
  if (!value) return null;
  return value.year ? `${formatBirthday(value.day, value.month)} ${value.year}` : formatBirthday(value.day, value.month);
}

export type BirthdayPerson = {
  id: string;
  name: string;
  photoUrl: string | null;
  company: string;
  category: string;
  chapter: string;
  whatsapp: string | null;
  phone: string | null;
  day: number;
  month: number;
  /** "14 March" */
  label: string;
  /** 0 = today. */
  daysAway: number;
  isMe: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Days from today (IST) to the member's next birthday. A 29 February
 * birthday is celebrated on 28 February in non-leap years.
 */
export function daysUntilBirthday(day: number, month: number, now = new Date()): number {
  const today = istParts(now);
  const todayUtc = Date.UTC(today.year, today.month, today.day);
  const occurrence = (year: number) => {
    const d = month === 2 && day === 29 && daysInMonth(2, year) === 28 ? 28 : day;
    return Date.UTC(year, month - 1, d);
  };
  let next = occurrence(today.year);
  if (next < todayUtc) next = occurrence(today.year + 1);
  return Math.round((next - todayUtc) / DAY_MS);
}

/**
 * Birthdays a signed-in member can see: the same fellow members as the
 * picker / Find Members Nearby (fellowMemberScope), ACTIVE only, plus the
 * viewer themselves. Sorted by how soon the birthday comes round.
 */
export async function getVisibleBirthdays(viewerMemberId: string, now = new Date()): Promise<BirthdayPerson[]> {
  const scope = await fellowMemberScope(viewerMemberId);
  const members = await db.member.findMany({
    where: {
      AND: [scope, { status: "ACTIVE" }, { birthDay: { not: null } }, { birthMonth: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      phone: true,
      whatsapp: true,
      birthDay: true,
      birthMonth: true,
      company: { select: { name: true } },
      category: { select: { name: true } },
      chapter: { select: { name: true } },
    },
  });

  return members
    .map((m) => {
      const day = m.birthDay!;
      const month = m.birthMonth!;
      return {
        id: m.id,
        name: m.name,
        photoUrl: m.photoUrl,
        company: m.company.name,
        category: m.category.name,
        chapter: m.chapter.name,
        whatsapp: m.whatsapp,
        phone: m.phone,
        day,
        month,
        label: formatBirthday(day, month),
        daysAway: daysUntilBirthday(day, month, now),
        isMe: m.id === viewerMemberId,
      };
    })
    .sort((a, b) => a.daysAway - b.daysAway || a.name.localeCompare(b.name));
}

export const UPCOMING_BIRTHDAY_DAYS = 30;

/** Splits a sorted list into today / the next 30 days / everyone else by month. */
export function groupBirthdays(people: BirthdayPerson[]) {
  const today = people.filter((p) => p.daysAway === 0);
  const upcoming = people.filter((p) => p.daysAway > 0 && p.daysAway <= UPCOMING_BIRTHDAY_DAYS);
  const byMonth = MONTH_NAMES.map((name, i) => ({
    month: i + 1,
    name,
    people: people.filter((p) => p.month === i + 1).sort((a, b) => a.day - b.day || a.name.localeCompare(b.name)),
  })).filter((g) => g.people.length > 0);
  return { today, upcoming, byMonth };
}

/** wa.me link with a ready-typed wish, or null when the member has no usable number. */
export function birthdayWishLink(person: Pick<BirthdayPerson, "name" | "whatsapp" | "phone">): string | null {
  const digits = (person.whatsapp || person.phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const number = digits.length === 10 ? `91${digits}` : digits;
  const firstName = person.name.split(" ")[0];
  return `https://wa.me/${number}?text=${encodeURIComponent(`Happy Birthday ${firstName}! 🎂 Wishing you a wonderful year ahead.`)}`;
}
