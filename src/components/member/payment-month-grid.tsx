import { Check, Clock } from "lucide-react";
import type { MonthTile } from "@/lib/payments/overview";
import { cn } from "@/lib/utils";

const STYLES: Record<MonthTile["status"], { box: string; text: string }> = {
  PAID: { box: "border-emerald-300 bg-emerald-50", text: "Paid" },
  PENDING: { box: "border-amber-300 bg-amber-50", text: "Awaiting approval" },
  DUE: { box: "border-red-200 bg-white", text: "Not paid" },
  NO_RECORD: { box: "border-neutral-200 bg-neutral-50", text: "No record" },
  UPCOMING: { box: "border-neutral-200 bg-white", text: "Upcoming" },
};

/** Phase 40 — month-by-month meeting-fee status: a tick for every month BWF has approved. */
export function PaymentMonthGrid({ tiles }: { tiles: MonthTile[] }) {
  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((t) => {
          const style = STYLES[t.status];
          return (
            <li
              key={`${t.year}-${t.month}`}
              className={cn("flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center", style.box, t.current && "ring-2 ring-emerald-800/40")}
            >
              <span className="text-xs font-semibold text-neutral-800">{t.label}</span>
              {t.status === "PAID" ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white" aria-hidden>
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : t.status === "PENDING" ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white" aria-hidden>
                  <Clock className="h-4 w-4" />
                </span>
              ) : (
                <span className={cn("h-7 w-7 rounded-full border-2 border-dashed", t.status === "DUE" ? "border-red-300" : "border-neutral-300")} aria-hidden />
              )}
              <span className={cn("text-[11px]", t.status === "PAID" ? "font-medium text-emerald-800" : t.status === "PENDING" ? "text-amber-800" : t.status === "DUE" ? "text-red-700" : "text-neutral-500")}>
                {style.text}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-neutral-500">
        A month gets its tick once BWF approves the payment covering it. The outlined month is the current one.
        &ldquo;No record&rdquo; means nothing was submitted here for that month — payments made before the website
        aren&rsquo;t shown.
      </p>
    </div>
  );
}
