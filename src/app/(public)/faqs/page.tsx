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
      <Container>
        <SectionLabel>FAQs</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">
          Frequently asked questions.
        </h1>

        <div className="mt-12 flex flex-col gap-2">
          {faqs.map((faq, index) => (
            <details key={faq.id} className="group border-b border-emerald-700 py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <span className="flex gap-4 font-medium text-ivory-100">
                  <span className="text-gold-400">{String(index + 1).padStart(2, "0")}</span>
                  <span>{faq.question}</span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="mt-3 text-justify text-slate-400 pl-9">{faq.answer}</p>
            </details>
          ))}
          {faqs.length === 0 ? <p className="text-slate-400">No FAQs published yet.</p> : null}
        </div>
      </Container>
    </div>
  );
}
