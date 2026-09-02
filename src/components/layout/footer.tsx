import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getContent } from "@/lib/content";

const EXPLORE_LINKS = [
  { href: "/about", label: "About BWF" },
  { href: "/chapters", label: "Chapters" },
  { href: "/members", label: "Member Directory" },
  { href: "/insights", label: "Insights" },
  { href: "/events", label: "Events" },
];

const MEMBERSHIP_LINKS = [
  { href: "/apply", label: "Apply for Membership" },
  { href: "/chapters", label: "Visit a Chapter" },
  { href: "/member", label: "Member Login" },
];

const MORE_LINKS = [
  { href: "/testimonials", label: "Testimonials" },
  { href: "/faqs", label: "FAQs" },
  { href: "/feedback", label: "Feedback" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
];

const DEFAULT_TAGLINE =
  "A private, chapter-based business community for Chennai's construction ecosystem — one category, one member, per chapter.";

export async function Footer() {
  const content = await getContent(["footer.tagline", "contact.phone", "contact.email", "contact.address"]);

  return (
    <footer className="border-t border-navy-700/60 bg-navy-950">
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg text-ivory-100">Builders World Forum</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            {content["footer.tagline"] ?? DEFAULT_TAGLINE}
          </p>
          {content["contact.email"] || content["contact.phone"] ? (
            <div className="mt-4 flex flex-col gap-1 text-sm text-slate-400">
              {content["contact.email"] ? (
                <a href={`mailto:${content["contact.email"]}`} className="hover:text-ivory-100">
                  {content["contact.email"]}
                </a>
              ) : null}
              {content["contact.phone"] ? <span>{content["contact.phone"]}</span> : null}
            </div>
          ) : null}
        </div>

        <FooterColumn title="Explore" links={EXPLORE_LINKS} />
        <FooterColumn title="Membership" links={MEMBERSHIP_LINKS} />
        <FooterColumn title="More" links={MORE_LINKS} />
      </Container>

      <div className="border-t border-navy-700/60">
        <Container className="flex flex-col items-center justify-between gap-4 py-6 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Builders World Forum. All rights reserved.</p>
          <p>{content["contact.address"] ?? "Chennai, India"}</p>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-gold-500">{title}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-slate-400 hover:text-ivory-100">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
