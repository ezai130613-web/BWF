import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

export const metadata: Metadata = {
  title: "FAQs",
  description: "Frequently asked questions about Builders World Forum.",
};

export default async function FaqsPage() {
  const faqs = await db.siteFaq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });

  const faqJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <div className="py-24">
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}
      <Container className="max-w-3xl">
        <SectionLabel>FAQs</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">
          Frequently asked questions.
        </h1>

        <div className="mt-12 flex flex-col gap-8">
          {faqs.map((faq) => (
            <div key={faq.id} className="border-b border-navy-700 pb-8">
              <p className="font-medium text-ivory-100">{faq.question}</p>
              <p className="mt-2 text-slate-400">{faq.answer}</p>
            </div>
          ))}
          {faqs.length === 0 ? <p className="text-slate-400">No FAQs published yet.</p> : null}
        </div>
      </Container>
    </div>
  );
}
