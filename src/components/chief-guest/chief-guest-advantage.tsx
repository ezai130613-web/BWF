import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";
import { NetworkDiagram } from "@/components/chief-guest/network-diagram";

const PROJECT_NODES = [
  "Architects",
  "Structural Consultants",
  "Contractors",
  "Building Material Suppliers",
  "Electrical & Plumbing",
  "Interior Designers",
  "HVAC Specialists",
  "Fabricators",
];

export function ChiefGuestAdvantage() {
  return (
    <section className="bg-emerald-800 py-28">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div className="lg:order-2">
          <SectionLabel>The Builder&rsquo;s Advantage</SectionLabel>
          <p className="mt-6 font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
            Building a Project? Meet the People Who Can Help Build It.
          </p>
          <p className="mt-4 max-w-md text-slate-400">
            From initial planning to final execution, connect with professionals across the
            construction value chain.
          </p>
          <p className="mt-6 max-w-md text-sm italic text-gold-300">
            Explore multiple professional connections through one BWF meeting.
          </p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-500">
            This is an illustrative example of the network&rsquo;s potential value — not a
            guarantee that every category or supplier will attend every meeting.
          </p>
          <Button href="/visit?purpose=chief-guest" variant="primary" className="mt-8">
            Apply as Chief Guest
          </Button>
        </div>

        <div className="lg:order-1">
          <NetworkDiagram center="YOUR NEXT PROJECT" nodes={PROJECT_NODES} />
        </div>
      </Container>
    </section>
  );
}
