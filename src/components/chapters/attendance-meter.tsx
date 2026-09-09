import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const STATS = [
  { value: "7 / 12", label: "Primary Minimum", body: "A primary member must personally attend at least 7 meetings within the rolling 12-meeting period." },
  { value: "2", label: "Substitute Maximum", body: "A substitute may represent the member for a maximum of 2 meetings." },
  { value: "3", label: "Leave Maximum", body: "A member may have a maximum of 3 leaves/absences." },
];

export function AttendanceMeter() {
  return (
    <section className="bg-emerald-900 py-24">
      <Container>
        <SectionLabel>BWF Attendance System</SectionLabel>
        <p className="mt-4 max-w-xl text-sm text-slate-400">
          6-month rolling period — 2 meetings per month × 6 months = 12 meetings.
        </p>

        <div className="mt-10 flex items-baseline gap-4">
          <span className="font-display text-6xl text-ivory-100 sm:text-7xl">12 / 12</span>
          <span className="text-sm text-slate-400">Ideal primary member attendance</span>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-sm border border-emerald-700 p-6">
              <p className="font-display text-3xl text-gold-400">{stat.value}</p>
              <p className="mt-2 font-medium text-ivory-100">{stat.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{stat.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm font-medium text-ivory-100">
          7 Primary + Up to 2 Substitute + Up to 3 Leave = 12 Meetings
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          The five non-primary attendances can&rsquo;t be used however a member chooses — you
          cannot have 5 substitutes or 5 leaves. If attendance falls outside these norms, the
          membership/category may be subject to action under BWF rules.
        </p>
      </Container>
    </section>
  );
}
