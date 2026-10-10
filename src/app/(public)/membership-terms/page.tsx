import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { formatInr } from "@/lib/format";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Membership Terms & Conditions",
  description:
    "The terms every Builders World Forum member agrees to on applying for, obtaining, or renewing membership.",
};

// Client-supplied copy (revised 2026-10-10), reproduced as given. Linked from the
// footer only — deliberately not in the header nav. Fee amounts come from the
// admin Fees settings so an edit there shows here too; the monthly setting is
// only used when it's a plain number (the per-meeting rate is half of it, two
// meetings a month), otherwise the client's original wording stands.
export default async function MembershipTermsPage() {
  const content = await getContent(["fees.annualMembership", "fees.monthlyMeeting"]);
  const annualFee = formatInr(content["fees.annualMembership"]);
  const monthlyFee = formatInr(content["fees.monthlyMeeting"]);
  const perMeetingFee = monthlyFee ? formatInr(String(Number(content["fees.monthlyMeeting"]) / 2)) : null;

  return (
    <LegalPageShell
      eyebrow="Membership"
      title="Membership Terms & Conditions"
      lastUpdated="10 October 2026"
      intro={
        "Welcome to Builders World Forum (BWF). By applying for, obtaining, or renewing your membership with BWF, you agree to comply with and be bound by the following Terms and Conditions. These rules are established to ensure structural clarity, maintain professional decorum, protect forum integrity, and promote collaborative business growth among all members."
      }
    >
      <h2>1. Membership Eligibility &amp; Category Protection</h2>
      <ul>
        <li>
          <strong>Industry Focus:</strong> Forum membership is exclusively reserved for
          professionals, business owners, and organizations operating within the{" "}
          <strong>Construction Industry</strong>. All applications are subject to approval by the{" "}
          <strong>Admin Team</strong>.
        </li>
        <li>
          <strong>Non-Core Category Allocation:</strong> To maintain the core focus of BWF while
          encouraging cross-industry synergy, the <strong>Head Table</strong> is authorized to admit
          members from non-core or allied industries, capped at a <strong>maximum of 10%</strong> of
          the total membership base.
        </li>
        <li>
          <strong>Category Representation:</strong> Members are permitted to represent and promote{" "}
          <strong>only the specific business category</strong> officially assigned and approved upon
          admission, ensuring fair business opportunities without category conflicts.
        </li>
      </ul>

      <h2>2. Fee Structure &amp; Payment Timelines</h2>
      <ul>
        <li>
          <strong>Annual Membership Fee:</strong>{" "}
          {annualFee ? `${annualFee} + applicable GST per annum` : "As confirmed by BWF, plus applicable GST, per annum"}{" "}
          (Non-refundable).
        </li>
        <li>
          <strong>Monthly Meeting Fee:</strong> {monthlyFee ?? "₹2,000"} + applicable GST per month
          (calculated at {perMeetingFee ?? "₹1,000"} + GST per meeting for 2 bi-monthly meetings).
          <ul>
            <li>
              <strong>Mandatory Standard:</strong> The monthly meeting fee applies to all active
              memberships <strong>irrespective of attendance</strong> (whether present, absent, or on
              leave).
            </li>
          </ul>
        </li>
        <li>
          <strong>Monthly Payment Schedule:</strong> The monthly meeting fee is payable{" "}
          <strong>
            on or before the 5th of every month OR before the first meeting of the month, whichever
            is earlier
          </strong>
          .
        </li>
      </ul>

      <h2>3. Membership Renewal Policy</h2>
      <ul>
        <li>
          <strong>Renewal Confirmation:</strong> Annual membership renewals and early renewals are
          reviewed and approved by the <strong>Head Table</strong>.
        </li>
        <li>
          <strong>15-Day Renewal Window:</strong> Members must complete their Annual Membership
          Renewal payment within <strong>15 days</strong> of their renewal due date.
        </li>
        <li>
          <strong>Category Status After Grace Period:</strong> If the renewal fee is not received
          within the <strong>15-day window</strong>, the membership will be considered lapsed, and
          the reserved business category will become available for new applicants.
        </li>
      </ul>

      <h2>4. Attendance, Leave, and Substitute Policy</h2>
      <ul>
        <li>
          <strong>Meeting Schedule:</strong> 2 regular meetings per month (Total of 12 meetings per
          6-month cycle).
        </li>
        <li>
          <strong>Leave Allocation:</strong> Members are permitted a maximum of{" "}
          <strong>3 leaves</strong> within any 6-month cycle.
        </li>
        <li>
          <strong>Substitute Provision:</strong> Members may send an authorized substitute for up to{" "}
          <strong>2 meetings</strong> within any 6-month cycle.
        </li>
        <li>
          <strong>Policy Parameters:</strong> Leave limits (3) and substitute limits (2) are
          independent allocations designed to help maintain member involvement and forum
          consistency.
        </li>
      </ul>

      <h2>5. Data Confidentiality &amp; Member Ethics</h2>
      <ul>
        <li>
          <strong>Confidentiality:</strong> Member directories, contact databases, referrals, and
          business leads shared within BWF meetings or official communication channels are
          proprietary and intended solely for internal member networking.
        </li>
        <li>
          <strong>Exclusivity:</strong> Information and contacts obtained through BWF should not be
          shared with external entities or competing networking platforms.
        </li>
        <li>
          <strong>Focus on BWF Growth:</strong> Members are expected to dedicate their BWF
          networking efforts toward mutual growth within this forum.
        </li>
      </ul>

      <h2>6. Inter-Member Transactions &amp; Forum Disclaimer</h2>
      <ul>
        <li>
          <strong>Professional Decorum:</strong> Members are expected to maintain financial
          discipline, honor service commitments, and uphold ethical business practices in all
          interactions.
        </li>
        <li>
          <strong>Forum Liability Disclaimer:</strong>{" "}
          <strong>Builders World Forum (BWF) is NOT liable</strong> for any independent commercial
          transactions, contracts, financial agreements, or service outcomes between members. All
          business dealings are conducted directly between the involved parties at their own risk
          and discretion.
        </li>
        <li>
          <strong>No Assurance or Guarantee of Business:</strong> Joining BWF provides access to a
          structured networking platform, directory, and ecosystem; however,{" "}
          <strong>BWF does not guarantee or assure any specific volume of business, leads, or
          revenue</strong>. BWF acts strictly as a platform—much like a library providing access to
          knowledge or a gym providing access to facilities. Generating business outcomes depends
          entirely on the individual member&apos;s proactive involvement, attendance, active
          engagement with fellow members and visiting Chief Guests, and the inherent strength of
          their commercial offering. Business conversion varies per member based on individual
          effort and networking diligence.
        </li>
      </ul>

      <h2>7. Duty to Honor Business Commitments &amp; Commercial Integrity</h2>
      <ul>
        <li>
          <strong>Obligation to Honor Deals:</strong> Members must handle all business inquiries,
          orders, and contracts obtained through BWF—whether originating from fellow members or
          visiting Chief Guests—with high professional standards and delivery efficiency.
        </li>
        <li>
          <strong>Unethical Practices Prohibited:</strong> Accepting advance payments without
          supplying goods/materials, failing to fulfill committed services, or engaging in deceptive
          business practices is <strong>strictly prohibited</strong>.
        </li>
        <li>
          <strong>Protection of Forum Goodwill:</strong> Visiting Chief Guests and external invitees
          engage with members based on BWF&apos;s institutional credibility and goodwill.
          Non-performance or failure to honor business deals risks implicating the forum. To
          prevent such risks, any failure to honor commercial commitments will be treated as a{" "}
          <strong>Gross Deviation</strong>, subjecting the member to immediate administrative
          review, suspension, or membership termination.
        </li>
      </ul>

      <h2>8. Mandatory Business Reporting &amp; Transparency</h2>
      <ul>
        <li>
          <strong>Requirement to Report Business:</strong> Members are required to promptly report,
          update, and log all business closed, transactions completed, or leads converted through
          BWF channels (including deals originating from internal members or visiting Chief
          Guests).
        </li>
        <li>
          <strong>Official Channels:</strong> Updates must be submitted via the designated BWF
          mobile application, official website portal, or prescribed group reporting protocols.
        </li>
        <li>
          <strong>Concealment as a Deviation:</strong> Systematically hiding, withholding, or
          failing to report business generated through BWF activities distorts community
          performance metrics and is considered an operational <strong>Deviation</strong>. Repeated
          failure to comply with reporting protocols despite administrative reminders will result
          in disciplinary evaluation.
        </li>
      </ul>

      <h2>9. Performance-Based Visibility &amp; Special Advantages</h2>
      <ul>
        <li>
          <strong>Contribution Benefits:</strong> Enhanced branding and promotional privileges are
          extended based on participation and contribution criteria established by the Head Table.
        </li>
        <li>
          <strong>Visibility Channels:</strong> Members who meet contribution targets may receive
          additional visibility opportunities, including features on the BWF website, social media
          spotlights, and participation in exhibitions or special events.
        </li>
        <li>
          <strong>Special Event Access:</strong> Access to VIP meets, Chief Guest interaction
          sessions, and special events beyond the regular bi-monthly meetings is aligned with member
          engagement and Head Table guidelines.
        </li>
      </ul>

      <h2>10. Code of Conduct &amp; Communication Etiquette</h2>
      <ul>
        <li>
          <strong>Dress Code:</strong> Members are required to attend all official BWF meetings in
          formal business attire.
        </li>
        <li>
          <strong>Harmony &amp; Neutrality:</strong> BWF maintains a purely professional
          environment. Discussions related to politics, groupism, or activities that disturb group
          harmony are strictly discouraged.
        </li>
        <li>
          <strong>WhatsApp Etiquette:</strong> Official BWF WhatsApp groups are dedicated
          exclusively to official forum announcements and relevant business updates.
        </li>
      </ul>

      <h2>11. General Compliance &amp; Disciplinary Framework</h2>
      <ul>
        <li>
          BWF leadership values active participation, ethical dealing, and mutual respect among all
          members.
        </li>
        <li>
          In cases where there is a <strong>significant or gross deviation</strong> from any of the
          terms outlined herein (including payment defaults, attendance non-compliance, breach of
          confidentiality, misbehavior, failure to honor business deals, or non-reporting of
          business), the matter will be referred to the{" "}
          <strong>BWF Disciplinary Committee / Head Table</strong> for review.
        </li>
        <li>
          The Disciplinary Committee / Head Table reserves the right to take appropriate
          administrative actions, up to and including{" "}
          <strong>immediate membership suspension or termination</strong>, to protect the
          forum&apos;s overall reputation and interest.
        </li>
        <li>
          The decision of the Head Table regarding any administrative review shall be{" "}
          <strong>final and binding</strong>. Upon membership termination, all membership
          privileges cease immediately, and past fees remain strictly non-refundable.
        </li>
      </ul>

      <h2>12. Governance &amp; Amendments</h2>
      <ul>
        <li>
          BWF leadership reserves the right to amend or update operational policies to adapt to
          future growth and maintain high organization standards. Continuous participation in BWF
          activities signifies full acceptance of the revised Terms and Conditions.
        </li>
      </ul>
    </LegalPageShell>
  );
}
