import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { formatInr, withGst } from "@/lib/format";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { VisitorRegisterForm } from "@/components/marketing/visitor-register-form";

export const metadata: Metadata = {
  title: "Visit a BWF Chapter",
  description: "Register to visit a Builders World Forum chapter meeting.",
};

export default async function VisitPage() {
  const [chapters, categories, members, content] = await Promise.all([
    db.chapter.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.member.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    getContent([
      "payment.qrCodeUrl",
      "payment.bankAccountName",
      "payment.bankAccountNumber",
      "payment.bankIfsc",
      "payment.upiId",
      "payment.bankName",
      "fees.visitorPrebookMeetingOnly",
      "fees.visitorPrebookMeetingBreakfast",
    ]),
  ]);

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Visit BWF</SectionLabel>
        <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
          Visit a BWF Chapter
        </h1>
        <p className="mt-4 max-w-xl text-slate-400">
          Experience a Builders World Forum meeting, meet construction-industry professionals and
          discover how the BWF network works.
        </p>

        <div className="mt-12 max-w-2xl">
          <VisitorRegisterForm
            categories={categories}
            chapters={chapters}
            members={members}
            qrCodeUrl={content["payment.qrCodeUrl"]}
            visitorMeetingOnlyFee={withGst(formatInr(content["fees.visitorPrebookMeetingOnly"]))}
            visitorMeetingBreakfastFee={withGst(formatInr(content["fees.visitorPrebookMeetingBreakfast"]))}
            bankAccountName={content["payment.bankAccountName"]}
            bankAccountNumber={content["payment.bankAccountNumber"]}
            bankIfsc={content["payment.bankIfsc"]}
            upiId={content["payment.upiId"]}
            bankName={content["payment.bankName"]}
          />
        </div>
      </Container>
    </div>
  );
}
