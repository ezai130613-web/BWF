import { getContent } from "@/lib/content";
import { formatAnnualMembershipFee, formatInr, withGst } from "@/lib/format";
import { Container } from "@/components/ui/container";
import { finalFee, formatRupees } from "@/lib/payments/fees";
import { getMeetingPackages } from "@/lib/payments/packages";
import { SectionLabel } from "@/components/ui/section-label";

export async function MeetingCharges() {
  const content = await getContent([
    "fees.visitorPrebookMeetingOnly",
    "fees.visitorPrebookMeetingBreakfast",
    "fees.visitorOnspotMeetingOnly",
    "fees.visitorOnspotMeetingBreakfast",
    "fees.annualMembership",
  ]);

  const prebookMeetingOnly = withGst(formatInr(content["fees.visitorPrebookMeetingOnly"]));
  const prebookBreakfast = withGst(formatInr(content["fees.visitorPrebookMeetingBreakfast"]));
  const onspotMeetingOnly = withGst(formatInr(content["fees.visitorOnspotMeetingOnly"]));
  const onspotBreakfast = withGst(formatInr(content["fees.visitorOnspotMeetingBreakfast"]));
  const annual = formatAnnualMembershipFee(content["fees.annualMembership"]);
  const packages = await getMeetingPackages();

  return (
    <section className="bg-emerald-900 py-24">
      <Container>
        <SectionLabel>Meeting Charges</SectionLabel>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-emerald-700 p-8">
            <p className="font-display text-xl text-ivory-100">Visitors</p>

            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-gold-500">Prebooking</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-display text-2xl text-gold-400">{prebookMeetingOnly}</p>
                <p className="mt-1 text-sm text-ivory-100">Meeting Only</p>
              </div>
              <div>
                <p className="font-display text-2xl text-gold-400">{prebookBreakfast}</p>
                <p className="mt-1 text-sm text-ivory-100">Meeting + Networking Breakfast</p>
              </div>
            </div>

            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-gold-500">Onspot</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-display text-2xl text-gold-400">{onspotMeetingOnly}</p>
                <p className="mt-1 text-sm text-ivory-100">Meeting Only</p>
              </div>
              <div>
                <p className="font-display text-2xl text-gold-400">{onspotBreakfast}</p>
                <p className="mt-1 text-sm text-ivory-100">Meeting + Networking Breakfast</p>
              </div>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Prebook while registering your visit for the lower rate — onspot pricing applies to
              walk-ins.
            </p>
          </div>

          <div className="rounded-sm border border-emerald-700 p-8">
            <p className="font-display text-xl text-ivory-100">Members</p>
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <p className="font-display text-3xl text-gold-400">{annual?.withGst ?? "Contact BWF"}</p>
                <p className="mt-1 text-sm text-ivory-100">Annual Membership Fee</p>
                <p className="mt-1 text-sm text-slate-400">
                  {annual ? "Per year, plus GST." : "Applicable annual BWF membership fee."}
                </p>
              </div>
              <div>
                <p className="font-display text-3xl text-gold-400">{withGst(formatRupees(finalFee(packages[0])))}</p>
                <p className="mt-1 text-sm text-ivory-100">Meeting Charges — {packages[0].meetings} meetings</p>
                <ul className="mt-2 flex flex-col gap-0.5 text-sm text-slate-300">
                  {packages.slice(1).map((p) => (
                    <li key={p.meetings}>
                      {p.meetings} meetings — {withGst(formatRupees(finalFee(p)))}
                      {p.discount ? <span className="text-gold-400"> (save {formatRupees(p.discount)})</span> : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-slate-400">
                  Covers hotel/venue, breakfast/food, and meeting arrangements for each meeting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
