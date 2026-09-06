import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { TestimonialsCarousel } from "@/components/marketing/testimonials-carousel";

export async function TestimonialsSection() {
  const testimonials = await db.testimonial.findMany({
    where: { status: "APPROVED", featured: true },
    include: { chapter: true },
    orderBy: { createdAt: "desc" },
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="bg-emerald-900 py-28">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <SectionLabel number="06">Testimonials</SectionLabel>
          <Link href="/testimonials" className="text-sm font-medium text-gold-400 hover:underline">
            View all →
          </Link>
        </div>

        <TestimonialsCarousel
          testimonials={testimonials.map((t) => ({
            id: t.id,
            content: t.content,
            name: t.name,
            meta: [t.role, t.company, t.chapter?.name].filter(Boolean).join(" · "),
          }))}
        />
      </Container>
    </section>
  );
}
