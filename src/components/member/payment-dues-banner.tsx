import Link from "next/link";
import { BellRing } from "lucide-react";
import { formatDateKey, type MemberDues } from "@/lib/payments/coverage";

/**
 * "Hi …, you're due for payment" (client, 2026-11-03) — shown on the member
 * portal dashboard and Payments page whenever the next meeting's fee or this
 * year's membership isn't paid. Both are needed to check in at a meeting.
 */
export function PaymentDuesBanner({ name, dues, showLink = false }: { name: string; dues: MemberDues; showLink?: boolean }) {
  if (!dues.isDue) return null;
  const items: string[] = [];
  if (dues.nextMeeting && dues.nextMeeting.status === null) {
    const more = dues.unpaidSoon.length > 1 ? ` (${dues.unpaidSoon.length} meetings unpaid in the next 2 months)` : "";
    items.push(`Meeting fee — your next meeting is ${formatDateKey(dues.nextMeeting.date)}; pay by ${formatDateKey(dues.nextMeeting.payBy)}${more}.`);
  }
  if (dues.membership.status === null) items.push(`Annual BWF membership for ${dues.membership.year}.`);
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900">
      <p className="flex items-center gap-2 font-semibold">
        <BellRing className="h-4 w-4" aria-hidden /> Hi {name.split(" ")[0]}, you&apos;re due for payment
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-red-800">You need both paid to mark attendance at a meeting.</p>
      {showLink ? (
        <Link href="/member/payments" className="mt-3 inline-block rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Go to Payments
        </Link>
      ) : null}
    </div>
  );
}
