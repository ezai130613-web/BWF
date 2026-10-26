import { MONTH_NAMES } from "@/lib/members/birthday-format";

const selectClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

/** Phase 37 — day / month / optional year inputs, shared by the admin member page and the member's own profile. Uncontrolled: after a submit React resets them to these defaults, so a form passes back what was submitted on an error. */
export function BirthdayFields({
  day,
  month,
  year,
}: {
  day: number | string | null;
  month: number | string | null;
  year: number | string | null;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Day
        <select name="birthDay" defaultValue={day ?? ""} className={selectClass}>
          <option value="">—</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Month
        <select name="birthMonth" defaultValue={month ?? ""} className={selectClass}>
          <option value="">—</option>
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        <span className="whitespace-nowrap">
          Year <span className="font-normal text-neutral-400">(optional)</span>
        </span>
        <input
          name="birthYear"
          type="number"
          inputMode="numeric"
          min={1920}
          max={new Date().getFullYear()}
          defaultValue={year ?? ""}
          placeholder="e.g. 1985"
          className={`${selectClass} w-32`}
        />
      </label>
    </div>
  );
}
