import Link from "next/link";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export async function TestimonialsSection() {
  const testimonials = await db.testimonial.findMany({
    where: { status: "APPROVED", featured: true },
    include: { chapter: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (testimonials.length === 0) return null;

  return (
    <section className="bg-navy-900 py-28">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <SectionLabel number="08">Testimonials</SectionLabel>
          <Link href="/testimonials" className="text-sm font-medium text-gold-400 hover:underline">
            View all →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-sm border border-navy-700 p-6">
              <p className="text-slate-300">&ldquo;{t.content}&rdquo;</p>
              <p className="mt-4 text-sm text-ivory-100">{t.name}</p>
              <p className="text-xs text-slate-500">
                {[t.role, t.company, t.chapter?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
