import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export function InsideBwf() {
  return (
    <section className="bg-navy-900 py-28">
      <Container>
        <SectionLabel number="05">Inside BWF</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          Chapter meetings, networking, and business introductions.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <MediaPlaceholder
            brief="Chapter meeting in progress — wide shot"
            className="aspect-[4/3] lg:col-span-2 lg:aspect-auto lg:row-span-2"
          />
          <MediaPlaceholder brief="Member introduction / handshake moment" className="aspect-[4/3]" />
          <MediaPlaceholder brief="BWF event — networking" className="aspect-[4/3]" />
        </div>
      </Container>
    </section>
  );
}
