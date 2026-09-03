import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { SubmitTestimonialForm } from "@/components/marketing/submit-testimonial-form";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

export const metadata: Metadata = {
  title: "Testimonials",
  description: "What BWF members and visitors say about the community.",
};

export default async function TestimonialsPage() {
  const [testimonials, chapters] = await Promise.all([
    db.testimonial.findMany({
      where: { status: "APPROVED" },
      include: { chapter: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    db.chapter.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Testimonials</SectionLabel>
        <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
          What members say.
        </h1>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-sm border border-navy-700 p-6">
              <p className="text-slate-300">&ldquo;{t.content}&rdquo;</p>
              <p className="mt-4 text-sm text-ivory-100">{t.name}</p>
              <p className="text-xs text-slate-500">
                {[t.role, t.company, t.chapter?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
          {testimonials.length === 0 ? <p className="text-slate-400">No testimonials published yet.</p> : null}
        </div>

        <div className="mt-20 max-w-xl border-t border-navy-700 pt-12">
          <SectionLabel>Share your experience</SectionLabel>
          <div className="mt-6">
            <SubmitTestimonialForm chapters={chapters} />
          </div>
        </div>
      </Container>
    </div>
  );
}
