/**
 * One-off (2026-11-03): payments made before meeting-date payments only
 * recorded calendar months. This fills Payment.meetingDates with the member's
 * chapter meetings in those months (real Meeting rows where they exist,
 * otherwise the chapter schedule), so attendance checks see them.
 *
 *   npx tsx scripts/backfill-payment-meeting-dates.ts           # dry run
 *   npx tsx scripts/backfill-payment-meeting-dates.ts --apply   # writes
 *
 * Needs migration 20261103130000_meeting_date_payments applied first.
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { parseMonthsCovered, formatMonthsCovered } from "@/lib/attendance/manage";
import { keyToDbDate, meetingDaysForMonths } from "@/lib/payments/coverage";

async function main() {
  const apply = process.argv.includes("--apply");
  const payments = await db.payment.findMany({
    where: { type: "MEETING", meetingDates: { isEmpty: true } },
    include: { member: { select: { name: true, chapter: { select: { id: true, name: true, meetingWeekday: true, meetingWeeksOfMonth: true } } } } },
  });
  for (const p of payments) {
    const dates = await meetingDaysForMonths(p.member.chapter, parseMonthsCovered(p.monthsCovered));
    console.log(`${p.member.name} (${p.member.chapter.name}) ${p.status} — ${formatMonthsCovered(p.monthsCovered)} → ${dates.join(", ") || "NO MEETINGS FOUND"}`);
    if (apply && dates.length) await db.payment.update({ where: { id: p.id }, data: { meetingDates: dates.map(keyToDbDate) } });
  }
  console.log(apply ? `\nUpdated ${payments.length} payment(s).` : `\n${payments.length} payment(s) — dry run, re-run with --apply.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
