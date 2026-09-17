import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

function EcosystemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="17" r="2.2" />
      <circle cx="19" cy="17" r="2.2" />
      <path d="M10.5 6.8L6.5 15.2M13.5 6.8l4 8.4M7.2 17h9.6" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M19 19l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function ExchangeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M2 12l4-4 4 3 4-3 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11l4 5 2-2M18 11l-4 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PresentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M3 10l14-5v14L3 14v-4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 9.5a3.5 3.5 0 010 5" strokeLinecap="round" />
      <path d="M6 14v4a1 1 0 001 1h1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M7 9a3 3 0 100 6c2 0 3.5-2 5-4.5S15.5 6 17.5 6a3 3 0 010 6c-2 0-3.5-2-5-4.5S9 3 7 3" />
    </svg>
  );
}

const BENEFITS = [
  {
    Icon: EcosystemIcon,
    title: "Access a Complete Business Ecosystem",
    body:
      "Connect with professionals from different industries and specialisations within the BWF network — from planning and design through to execution and completion.",
  },
  {
    Icon: SearchIcon,
    title: "Discover Suppliers for Your Projects",
    body:
      "Meet suppliers, contractors, manufacturers and specialist service providers who may be able to support your upcoming projects — multiple sourcing possibilities through one network.",
  },
  {
    Icon: ExchangeIcon,
    title: "Explore Competitive Commercial Proposals",
    body:
      "Connect directly with potential vendors and discuss pricing, project requirements and commercial terms, and compare suitable proposals for your procurement needs.",
  },
  {
    Icon: HandshakeIcon,
    title: "Meet Business Owners & Decision-Makers",
    body:
      "Build relationships with entrepreneurs, company directors, senior executives and other professionals within the BWF community — connections that may extend beyond the meeting itself.",
  },
  {
    Icon: PresentIcon,
    title: "Present Your Business to a Relevant Audience",
    body:
      "Introduce your company, its capabilities, upcoming projects or business requirements to an audience of professionals, and identify potential collaboration opportunities.",
  },
  {
    Icon: InfinityIcon,
    title: "Build Long-Term Business Relationships",
    body:
      "Establish professional connections that may lead to referrals, partnerships, supplier relationships and future business opportunities.",
  },
];

export function ChiefGuestBenefits() {
  return (
    <section id="benefits" className="bg-emerald-950 py-28">
      <Container>
        <SectionLabel>Why Become a Chief Guest?</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          One Platform. Multiple Business Opportunities.
        </p>
        <p className="mt-4 max-w-xl text-slate-400">
          Meet the professionals, suppliers and decision-makers who can contribute to your next
          business opportunity.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-sm border border-emerald-700 p-6 transition-transform hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/60 text-gold-400">
                <Icon />
              </div>
              <h3 className="mt-5 font-display text-lg text-ivory-100">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
