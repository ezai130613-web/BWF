import { setAttendanceRequiresPayment } from "@/app/admin/(dashboard)/payments/record/actions";
import { cn } from "@/lib/utils";

/** "No payment, no attendance" switch (2026-11-03) — off until Accounts has entered existing payments. */
export function AttendancePaymentSwitch({ on }: { on: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 shadow-sm",
        on ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="max-w-2xl text-sm">
        <p className="font-semibold text-neutral-900">Attendance requires payment: {on ? "ON" : "OFF"}</p>
        <p className="mt-0.5 text-neutral-700">
          {on
            ? "Members can check in only when that meeting's fee and the year's membership are paid."
            : "Anyone can check in right now. Enter the payments members have already made, then switch this on."}
        </p>
      </div>
      <form action={setAttendanceRequiresPayment.bind(null, !on)}>
        <button
          type="submit"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium shadow-sm",
            on ? "border border-neutral-300 bg-white text-neutral-700 hover:border-red-400 hover:text-red-700" : "bg-emerald-800 text-white hover:bg-emerald-700",
          )}
        >
          {on ? "Switch off" : "Switch on"}
        </button>
      </form>
    </div>
  );
}
