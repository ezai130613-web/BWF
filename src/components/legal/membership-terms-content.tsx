import { Fragment } from "react";
import { getMembershipTerms, type TermsItem } from "@/lib/legal/membership-terms";

export { MEMBERSHIP_TERMS_INTRO, MEMBERSHIP_TERMS_LAST_UPDATED } from "@/lib/legal/membership-terms";

// Renders the Membership T&C for /membership-terms and the pop-up applicants
// must accept on /apply. The words live in src/lib/legal/membership-terms.ts,
// shared with the copy emailed to every applicant, so the three can't drift.
export async function MembershipTermsContent() {
  const sections = await getMembershipTerms();

  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.title}>
          <h2>{section.title}</h2>
          <TermsList items={section.items} />
        </Fragment>
      ))}
    </>
  );
}

function TermsList({ items }: { items: TermsItem[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          {item.label ? (
            <>
              <strong>{item.label}</strong>{" "}
            </>
          ) : null}
          {item.text.map((run, runIndex) => (typeof run === "string" ? run : <strong key={runIndex}>{run.b}</strong>))}
          {item.children ? <TermsList items={item.children} /> : null}
        </li>
      ))}
    </ul>
  );
}
