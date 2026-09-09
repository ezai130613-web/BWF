import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const ROWS = [
  { label: "Who?", oneToOne: "2 BWF members.", conclave: "3 or more BWF members.", powerDate: "One or more BWF members + an external connection." },
  {
    label: "Purpose",
    oneToOne: "Understand each other deeply.",
    conclave: "Group networking, collaboration and business discussion.",
    powerDate: "Introduce fellow BWF members to a valuable outside business connection.",
  },
  { label: "External person required?", oneToOne: "No.", conclave: "No.", powerDate: "Yes." },
];

export function MeetingComparison() {
  return (
    <section className="bg-emerald-800 py-24">
      <Container>
        <SectionLabel>One-to-One vs Conclave vs Power Date</SectionLabel>
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-emerald-600 text-left text-ivory-100">
                <th className="w-1/4 pb-4 pr-4 font-display text-base font-normal" />
                <th className="pb-4 pr-4 font-display text-base font-normal">One-to-One</th>
                <th className="pb-4 pr-4 font-display text-base font-normal">Conclave</th>
                <th className="pb-4 font-display text-base font-normal">Power Date</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-emerald-700/60">
                  <td className="py-4 pr-4 font-medium text-ivory-100">{row.label}</td>
                  <td className="py-4 pr-4 text-slate-400">{row.oneToOne}</td>
                  <td className="py-4 pr-4 text-slate-400">{row.conclave}</td>
                  <td className="py-4 text-slate-400">{row.powerDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}
