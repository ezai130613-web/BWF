import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";

const SAMPLE_CATEGORIES = ["Architects", "Civil Contractors", "Interior Designers", "Plumbing"];

export function FindProfessional() {
  return (
    <section className="bg-navy-800 py-28">
      <Container className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <SectionLabel number="04">Find a BWF Professional</SectionLabel>
          <p className="mt-6 font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
            Every category. One trusted member.
          </p>
          <p className="mt-4 max-w-lg text-slate-400">
            Search the directory by chapter, category, or service to find the right BWF member
            for your next project.
          </p>
          <Button href="/members" variant="primary" className="mt-8">
            Explore the Directory
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {SAMPLE_CATEGORIES.map((category) => (
            <span
              key={category}
              className="rounded-full border border-navy-600 px-4 py-2 text-sm text-slate-400"
            >
              {category}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
