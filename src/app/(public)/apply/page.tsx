import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { getChapterAvailability } from "@/lib/applications/availability";
import { APPLY_CATEGORY_NAMES } from "@/lib/apply-categories";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { ApplyWizard } from "@/components/marketing/apply-wizard";

export const metadata: Metadata = {
  title: "Apply for Membership",
  description: "Check category availability and apply for Builders World Forum membership.",
};

export default async function ApplyPage() {
  // Scoped to BWF's official category list (src/lib/apply-categories.ts) —
  // deliberately not every active Category row, which also holds the
  // precise per-member text off the roster sheets (e.g. "SS Handrail /
  // Fabrication"). A new applicant picks from the clean taxonomy; existing
  // members' own category text is untouched wherever else it's shown.
  const categories = await db.category.findMany({
    where: { isActive: true, name: { in: [...APPLY_CATEGORY_NAMES] } },
    orderBy: { name: "asc" },
  });

  const availabilityByCategory = Object.fromEntries(
    await Promise.all(categories.map(async (c) => [c.id, await getChapterAvailability(c.id)] as const)),
  );

  const content = await getContent([
    "apply.intro",
    "apply.steps",
    "apply.category_not_available",
    "payment.membershipQrCodeUrl",
    "payment.membershipBankAccountName",
    "payment.membershipBankAccountNumber",
    "payment.membershipBankIfsc",
    "payment.membershipSwiftCode",
    "payment.membershipUpiId",
    "payment.membershipBankName",
  ]);
  const steps = content["apply.steps"]?.split("\n").filter(Boolean) ?? [];

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Membership</SectionLabel>
        <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
          Apply for Membership
        </h1>
        <p className="mt-4 max-w-xl text-slate-400">
          One member per category, per chapter — check availability before you apply.
        </p>

        <div className="mt-16 grid gap-16 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-12">
            {content["apply.intro"] || steps.length > 0 ? (
              <div>
                <SectionLabel>How to Join a BWF Chapter</SectionLabel>
                {content["apply.intro"] ? <p className="mt-4 max-w-2xl text-slate-300">{content["apply.intro"]}</p> : null}
                {steps.length > 0 ? (
                  <ol className="mt-8 grid gap-6 sm:grid-cols-2">
                    {steps.map((line, i) => {
                      const [title, ...rest] = line.split(":");
                      const detail = rest.join(":").trim();
                      return (
                        <li key={i}>
                          <p className="font-medium text-ivory-100">{title}</p>
                          <p className="mt-1 text-sm text-slate-400">{detail}</p>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </div>
            ) : null}

            {content["apply.category_not_available"] ? (
              <div className="rounded-sm border border-emerald-700 p-6">
                <p className="text-sm font-medium text-gold-400">What if my category is not available?</p>
                <p className="mt-2 text-sm text-slate-400">{content["apply.category_not_available"]}</p>
              </div>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-sm border border-emerald-700 p-6">
              <SectionLabel>Start your application</SectionLabel>
              <div className="mt-6">
                <ApplyWizard
                  categories={categories}
                  availabilityByCategory={availabilityByCategory}
                  qrCodeUrl={content["payment.membershipQrCodeUrl"]}
                  bankAccountName={content["payment.membershipBankAccountName"]}
                  bankAccountNumber={content["payment.membershipBankAccountNumber"]}
                  bankIfsc={content["payment.membershipBankIfsc"]}
                  swiftCode={content["payment.membershipSwiftCode"]}
                  upiId={content["payment.membershipUpiId"]}
                  bankName={content["payment.membershipBankName"]}
                />
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
