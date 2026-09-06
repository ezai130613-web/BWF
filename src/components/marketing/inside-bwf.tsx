import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { PhotoSlot } from "@/components/ui/photo-slot";

export function InsideBwf() {
  return (
    <section className="bg-emerald-900 py-28">
      <Container>
        <SectionLabel number="05">Inside BWF</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          Chapter meetings, networking, and business introductions.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <PhotoSlot
            src="/images/homepage-chapter-meeting.jpg"
            alt="A BWF chapter meeting in progress"
            brief="Chapter meeting in progress — wide shot"
            unoptimized={false}
            className="aspect-[4/3] lg:col-span-2 lg:aspect-auto lg:row-span-2"
          />
          <PhotoSlot
            src="/images/homepage-member-introduction.jpg"
            alt="Two BWF members making an introduction"
            brief="Member introduction / handshake moment"
            unoptimized={false}
            className="aspect-[4/3]"
          />
          <PhotoSlot
            src="/images/homepage-event-networking.jpg"
            alt="Members networking at a BWF event"
            brief="BWF event — networking"
            unoptimized={false}
            className="aspect-[4/3]"
          />
        </div>
      </Container>
    </section>
  );
}
