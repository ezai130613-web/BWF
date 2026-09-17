import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { NetworkDiagram } from "@/components/chief-guest/network-diagram";

const HERO_NODES = ["Builders", "Architects", "Contractors", "Suppliers", "Consultants", "Service Providers"];

export function ChiefGuestHero() {
  return (
    <section className="bg-emerald-950 pb-20 pt-40">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl leading-[1.1] text-ivory-100 sm:text-5xl lg:text-6xl">
            Lead the Conversation.
            <br />
            <span className="text-gold-500">Build Valuable Connections.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400">
            Connect with Chennai&rsquo;s construction ecosystem, discover capable suppliers and
            build relationships that create meaningful business opportunities.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button href="/visit?purpose=chief-guest" variant="primary">
              Apply as Chief Guest
            </Button>
            <Link
              href="#benefits"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gold-500/60 px-6 py-3 text-sm font-medium tracking-wide text-ivory-100 transition-colors hover:border-gold-400 hover:text-gold-300"
            >
              Explore the Benefits
            </Link>
          </div>
        </div>

        <NetworkDiagram center="CHIEF GUEST" nodes={HERO_NODES} />
      </Container>
    </section>
  );
}
