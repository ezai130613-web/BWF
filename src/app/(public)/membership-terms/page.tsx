import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import {
  MembershipTermsContent,
  MEMBERSHIP_TERMS_INTRO,
  MEMBERSHIP_TERMS_LAST_UPDATED,
} from "@/components/legal/membership-terms-content";

export const metadata: Metadata = {
  title: "Membership Terms & Conditions",
  description:
    "The terms every Builders World Forum member agrees to on applying for, obtaining, or renewing membership.",
};

// Linked from the footer and from the /apply acceptance pop-up — deliberately
// not in the header nav. The copy itself lives in MembershipTermsContent.
export default function MembershipTermsPage() {
  return (
    <LegalPageShell
      eyebrow="Membership"
      title="Membership Terms & Conditions"
      lastUpdated={MEMBERSHIP_TERMS_LAST_UPDATED}
      intro={MEMBERSHIP_TERMS_INTRO}
    >
      <MembershipTermsContent />
    </LegalPageShell>
  );
}
