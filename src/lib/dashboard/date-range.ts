/**
 * Corrections brief §13 — global dashboard date-range filter. Only the
 * period-scoped metrics (new visitors, new applications, new members,
 * conversions) respond to this; current-state metrics (Active Members,
 * Open Category Slots, Pending Approvals, Upcoming Meetings, ...) are
 * deliberately left alone per the brief's own "do not apply date filtering
 * to inherently current-state metrics" rule — see metrics.ts.
 */

export const DATE_RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]["value"];

export type DateRange = {
  preset: DateRangePreset;
  label: string;
  from: Date;
  to: Date;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function isValidPreset(value: string | undefined): value is DateRangePreset {
  return DATE_RANGE_PRESETS.some((p) => p.value === value);
}

/**
 * Defaults to "This Month" — the brief doesn't state a default for this
 * particular filter (unlike the Member Performance panel's own date filter,
 * which explicitly defaults to "This Week"), so a full-month window was
 * chosen as a reasonable middle ground between "Today" (too narrow to be
 * useful on a quiet day) and "This Year" (too wide to read as "recent
 * activity").
 */
export function resolveDateRange(searchParams: { range?: string; from?: string; to?: string }): DateRange {
  const now = new Date();
  const today = startOfDay(now);
  const to = endOfDay(now);
  const preset: DateRangePreset = isValidPreset(searchParams.range) ? searchParams.range : "this_month";

  switch (preset) {
    case "today":
      return { preset, label: "Today", from: today, to };
    case "this_week": {
      const from = new Date(today);
      from.setDate(from.getDate() - from.getDay());
      return { preset, label: "This Week", from, to };
    }
    case "last_30_days": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { preset, label: "Last 30 Days", from, to };
    }
    case "last_6_months": {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 6);
      return { preset, label: "Last 6 Months", from, to };
    }
    case "this_year":
      return { preset, label: "This Year", from: new Date(now.getFullYear(), 0, 1), to };
    case "custom": {
      const from = searchParams.from ? startOfDay(new Date(searchParams.from)) : new Date(now.getFullYear(), now.getMonth(), 1);
      const customTo = searchParams.to ? endOfDay(new Date(searchParams.to)) : to;
      return { preset, label: "Custom Range", from, to: customTo };
    }
    case "this_month":
    default:
      return { preset: "this_month", label: "This Month", from: new Date(now.getFullYear(), now.getMonth(), 1), to };
  }
}
