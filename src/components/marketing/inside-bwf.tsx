import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { PhotoSlot } from "@/components/ui/photo-slot";

/** §7 — clicking any of these images takes the visitor to the Chapters page's
 * "What Happens Inside a BWF Meeting?" section, which is now that page's own
 * top-level heading (Priority 1 #2's rebuild) — so linking to /chapters
 * itself already lands there, no anchor needed. */
function InsideBwfImage({ src, alt, brief, className }: { src: string; alt: string; brief: string; className: string }) {
  return (
    <Link href="/chapters" className={`group block overflow-hidden ${className}`}>
      <PhotoSlot
        src={src}
        alt={alt}
        brief={brief}
        unoptimized={false}
        className="h-full w-full transition-transform duration-300 group-hover:scale-105"
      />
    </Link>
  );
}

export function InsideBwf() {
  return (
    <section className="bg-emerald-900 py-28">
      <Container>
        <SectionLabel number="05">Inside BWF</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          Chapter meetings, networking, and business introductions.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <InsideBwfImage
            src="/images/homepage-chapter-meeting.jpg"
            alt="A BWF chapter meeting in progress"
            brief="Chapter meeting in progress — wide shot"
            className="aspect-[4/3] lg:col-span-2 lg:aspect-auto lg:row-span-2"
          />
          <InsideBwfImage
            src="/images/homepage-member-introduction.jpg"
            alt="Two BWF members making an introduction"
            brief="Member introduction / handshake moment"
            className="aspect-[4/3]"
          />
          <InsideBwfImage
            src="/images/homepage-event-networking.jpg"
            alt="Members networking at a BWF event"
            brief="BWF event — networking"
            className="aspect-[4/3]"
          />
        </div>
      </Container>
    </section>
  );
}
