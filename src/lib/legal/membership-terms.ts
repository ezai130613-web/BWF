import { getContent } from "@/lib/content";
import { formatAnnualMembershipFee, formatInr } from "@/lib/format";

/**
 * Membership Terms & Conditions, client-supplied copy reproduced as given
 * (revised 2026-10-10, renewal/training pointers 2026-10-26). Kept as data so
 * the /membership-terms page, the /apply acceptance pop-up and the email
 * sent to every applicant (2026-10-26) all render the same words. Edit the
 * terms here, never in a renderer.
 *
 * Fee amounts come from the admin Fees settings so an edit there shows here
 * too. The monthly setting is only used when it's a plain number (the
 * per-meeting rate is half of it, two meetings a month), otherwise the
 * client's original wording stands.
 */

export const MEMBERSHIP_TERMS_LAST_UPDATED = "26 October 2026";

export const MEMBERSHIP_TERMS_INTRO =
  "Welcome to Builders World Forum (BWF). By applying for, obtaining, or renewing your membership with BWF, you agree to comply with and be bound by the following Terms and Conditions. These rules are established to ensure structural clarity, maintain professional decorum, protect forum integrity, and promote collaborative business growth among all members.";

/** A run of text; `{ b }` is bold. */
export type TermsRun = string | { b: string };
export type TermsItem = { label?: string; text: TermsRun[]; children?: TermsItem[] };
export type TermsSection = { title: string; items: TermsItem[] };

export async function getMembershipTerms(): Promise<TermsSection[]> {
  const content = await getContent(["fees.annualMembership", "fees.monthlyMeeting"]);
  const annualFee = formatAnnualMembershipFee(content["fees.annualMembership"]);
  const monthlyFee = formatInr(content["fees.monthlyMeeting"]);
  const perMeetingFee = monthlyFee ? formatInr(String(Number(content["fees.monthlyMeeting"]) / 2)) : null;

  return [
    {
      title: "1. Membership Eligibility & Category Protection",
      items: [
        {
          label: "Industry Focus:",
          text: [
            "Forum membership is exclusively reserved for professionals, business owners, and organizations operating within the ",
            { b: "Construction Industry" },
            ". All applications are subject to approval by the ",
            { b: "Admin Team" },
            ".",
          ],
        },
        {
          label: "Non-Core Category Allocation:",
          text: [
            "To maintain the core focus of BWF while encouraging cross-industry synergy, the ",
            { b: "Head Table" },
            " is authorized to admit members from non-core or allied industries, capped at a ",
            { b: "maximum of 10%" },
            " of the total membership base.",
          ],
        },
        {
          label: "Category Representation:",
          text: [
            "Members are permitted to represent and promote ",
            { b: "only the specific business category" },
            " officially assigned and approved upon admission, ensuring fair business opportunities without category conflicts.",
          ],
        },
      ],
    },
    {
      title: "2. Fee Structure & Payment Timelines",
      items: [
        {
          label: "Annual Membership Fee:",
          text: [
            `${annualFee ? `${annualFee.withGst} per annum (${annualFee.total} in total)` : "As confirmed by BWF, plus applicable GST, per annum"} (Non-refundable).`,
          ],
        },
        {
          label: "Monthly Meeting Fee:",
          text: [
            `${monthlyFee ?? "₹2,000"} + applicable GST per month (calculated at ${perMeetingFee ?? "₹1,000"} + GST per meeting for 2 bi-monthly meetings).`,
          ],
          children: [
            {
              label: "Mandatory Standard:",
              text: [
                "The monthly meeting fee applies to all active memberships ",
                { b: "irrespective of attendance" },
                " (whether present, absent, or on leave).",
              ],
            },
          ],
        },
        {
          label: "Monthly Payment Schedule:",
          text: [
            "The monthly meeting fee is payable ",
            { b: "on or before the 5th of every month OR before the first meeting of the month, whichever is earlier" },
            ".",
          ],
        },
      ],
    },
    {
      title: "3. Membership Renewal Policy",
      items: [
        {
          label: "Renewal Confirmation:",
          text: ["Annual membership renewals and early renewals are reviewed and approved by the ", { b: "Head Table" }, "."],
        },
        {
          label: "Annual Renewal Deadline:",
          text: [
            "Memberships must be renewed annually. To maintain your active status, renewal payments must be settled ",
            { b: "at least 20 days prior to your membership expiration date" },
            " (365 days from signup).",
          ],
        },
        {
          label: "Category Status After Deadline:",
          text: [
            "If payment is not cleared by this deadline, the membership will be considered lapsed, and your membership slot and reserved business category will be made available to new applicants.",
          ],
        },
      ],
    },
    {
      title: "4. Attendance, Leave, and Substitute Policy",
      items: [
        { label: "Meeting Schedule:", text: ["2 regular meetings per month (Total of 12 meetings per 6-month cycle)."] },
        { label: "Leave Allocation:", text: ["Members are permitted a maximum of ", { b: "3 leaves" }, " within any 6-month cycle."] },
        {
          label: "Substitute Provision:",
          text: ["Members may send an authorized substitute for up to ", { b: "2 meetings" }, " within any 6-month cycle."],
        },
        {
          label: "Policy Parameters:",
          text: [
            "Leave limits (3) and substitute limits (2) are independent allocations designed to help maintain member involvement and forum consistency.",
          ],
        },
        {
          label: "Quarterly Training / Orientation:",
          text: [
            "Members must attend a training session / orientation held ",
            { b: "every 3 months (quarterly)" },
            " to maintain active membership status.",
          ],
        },
      ],
    },
    {
      title: "5. Data Confidentiality & Member Ethics",
      items: [
        {
          label: "Confidentiality:",
          text: [
            "Member directories, contact databases, referrals, and business leads shared within BWF meetings or official communication channels are proprietary and intended solely for internal member networking.",
          ],
        },
        {
          label: "Exclusivity:",
          text: ["Information and contacts obtained through BWF should not be shared with external entities or competing networking platforms."],
        },
        {
          label: "Focus on BWF Growth:",
          text: ["Members are expected to dedicate their BWF networking efforts toward mutual growth within this forum."],
        },
      ],
    },
    {
      title: "6. Inter-Member Transactions & Forum Disclaimer",
      items: [
        {
          label: "Professional Decorum:",
          text: [
            "Members are expected to maintain financial discipline, honor service commitments, and uphold ethical business practices in all interactions.",
          ],
        },
        {
          label: "Forum Liability Disclaimer:",
          text: [
            { b: "Builders World Forum (BWF) is NOT liable" },
            " for any independent commercial transactions, contracts, financial agreements, or service outcomes between members. All business dealings are conducted directly between the involved parties at their own risk and discretion.",
          ],
        },
        {
          label: "No Assurance or Guarantee of Business:",
          text: [
            "Joining BWF provides access to a structured networking platform, directory, and ecosystem; however, ",
            { b: "BWF does not guarantee or assure any specific volume of business, leads, or revenue" },
            ". BWF acts strictly as a platform—much like a library providing access to knowledge or a gym providing access to facilities. Generating business outcomes depends entirely on the individual member's proactive involvement, attendance, active engagement with fellow members and visiting Chief Guests, and the inherent strength of their commercial offering. Business conversion varies per member based on individual effort and networking diligence.",
          ],
        },
      ],
    },
    {
      title: "7. Duty to Honor Business Commitments & Commercial Integrity",
      items: [
        {
          label: "Obligation to Honor Deals:",
          text: [
            "Members must handle all business inquiries, orders, and contracts obtained through BWF—whether originating from fellow members or visiting Chief Guests—with high professional standards and delivery efficiency.",
          ],
        },
        {
          label: "Unethical Practices Prohibited:",
          text: [
            "Accepting advance payments without supplying goods/materials, failing to fulfill committed services, or engaging in deceptive business practices is ",
            { b: "strictly prohibited" },
            ".",
          ],
        },
        {
          label: "Protection of Forum Goodwill:",
          text: [
            "Visiting Chief Guests and external invitees engage with members based on BWF's institutional credibility and goodwill. Non-performance or failure to honor business deals risks implicating the forum. To prevent such risks, any failure to honor commercial commitments will be treated as a ",
            { b: "Gross Deviation" },
            ", subjecting the member to immediate administrative review, suspension, or membership termination.",
          ],
        },
      ],
    },
    {
      title: "8. Mandatory Business Reporting & Transparency",
      items: [
        {
          label: "Requirement to Report Business:",
          text: [
            "Members are required to promptly report, update, and log all business closed, transactions completed, or leads converted through BWF channels (including deals originating from internal members or visiting Chief Guests).",
          ],
        },
        {
          label: "Official Channels:",
          text: ["Updates must be submitted via the designated BWF mobile application, official website portal, or prescribed group reporting protocols."],
        },
        {
          label: "Concealment as a Deviation:",
          text: [
            "Systematically hiding, withholding, or failing to report business generated through BWF activities distorts community performance metrics and is considered an operational ",
            { b: "Deviation" },
            ". Repeated failure to comply with reporting protocols despite administrative reminders will result in disciplinary evaluation.",
          ],
        },
      ],
    },
    {
      title: "9. Performance-Based Visibility & Special Advantages",
      items: [
        {
          label: "Contribution Benefits:",
          text: [
            "Enhanced branding and promotional privileges are extended based on participation and contribution criteria established by the Head Table.",
          ],
        },
        {
          label: "Visibility Channels:",
          text: [
            "Members who meet contribution targets may receive additional visibility opportunities, including features on the BWF website, social media spotlights, and participation in exhibitions or special events.",
          ],
        },
        {
          label: "Special Event Access:",
          text: [
            "Access to VIP meets, Chief Guest interaction sessions, and special events beyond the regular bi-monthly meetings is aligned with member engagement and Head Table guidelines.",
          ],
        },
      ],
    },
    {
      title: "10. Code of Conduct & Communication Etiquette",
      items: [
        { label: "Dress Code:", text: ["Members are required to attend all official BWF meetings in formal business attire."] },
        {
          label: "Harmony & Neutrality:",
          text: [
            "BWF maintains a purely professional environment. Discussions related to politics, groupism, or activities that disturb group harmony are strictly discouraged.",
          ],
        },
        {
          label: "WhatsApp Etiquette:",
          text: ["Official BWF WhatsApp groups are dedicated exclusively to official forum announcements and relevant business updates."],
        },
      ],
    },
    {
      title: "11. General Compliance & Disciplinary Framework",
      items: [
        { text: ["BWF leadership values active participation, ethical dealing, and mutual respect among all members."] },
        {
          text: [
            "In cases where there is a ",
            { b: "significant or gross deviation" },
            " from any of the terms outlined herein (including payment defaults, attendance non-compliance, breach of confidentiality, misbehavior, failure to honor business deals, or non-reporting of business), the matter will be referred to the ",
            { b: "BWF Disciplinary Committee / Head Table" },
            " for review.",
          ],
        },
        {
          text: [
            "The Disciplinary Committee / Head Table reserves the right to take appropriate administrative actions, up to and including ",
            { b: "immediate membership suspension or termination" },
            ", to protect the forum's overall reputation and interest.",
          ],
        },
        {
          text: [
            "The decision of the Head Table regarding any administrative review shall be ",
            { b: "final and binding" },
            ". Upon membership termination, all membership privileges cease immediately, and past fees remain strictly non-refundable.",
          ],
        },
      ],
    },
    {
      title: "12. Governance & Amendments",
      items: [
        {
          text: [
            "BWF leadership reserves the right to amend or update operational policies to adapt to future growth and maintain high organization standards. Continuous participation in BWF activities signifies full acceptance of the revised Terms and Conditions.",
          ],
        },
      ],
    },
  ];
}

// --- Email renderers -------------------------------------------------------

const runText = (run: TermsRun) => (typeof run === "string" ? run : run.b);

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain-text version (email text part). */
export function membershipTermsToText(sections: TermsSection[]): string {
  const item = (it: TermsItem, depth: number): string => {
    const line = `${"   ".repeat(depth)}• ${it.label ? `${it.label} ` : ""}${it.text.map(runText).join("")}`;
    return [line, ...(it.children ?? []).map((c) => item(c, depth + 1))].join("\n");
  };
  return sections.map((s) => `${s.title.toUpperCase()}\n${s.items.map((it) => item(it, 0)).join("\n")}`).join("\n\n");
}

/** Inline-styled HTML version (email HTML part — email clients ignore <style> blocks unevenly). */
export function membershipTermsToHtml(sections: TermsSection[]): string {
  const runs = (text: TermsRun[]) => text.map((r) => (typeof r === "string" ? escapeHtml(r) : `<strong>${escapeHtml(r.b)}</strong>`)).join("");
  const list = (items: TermsItem[]): string =>
    `<ul style="margin:6px 0 0;padding-left:20px;">${items
      .map(
        (it) =>
          `<li style="margin:0 0 6px;">${it.label ? `<strong>${escapeHtml(it.label)}</strong> ` : ""}${runs(it.text)}${it.children ? list(it.children) : ""}</li>`,
      )
      .join("")}</ul>`;
  return sections
    .map((s) => `<h3 style="margin:20px 0 4px;font-size:15px;color:#14532d;">${escapeHtml(s.title)}</h3>${list(s.items)}`)
    .join("");
}
