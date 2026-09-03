import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { Button } from "@/components/ui/button";
import { TrackedAnchor } from "@/components/analytics/tracked-anchor";
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

async function getMember(slug: string) {
  return db.member.findFirst({
    where: { slug, status: "ACTIVE" },
    include: { company: true, chapter: true, category: true, leadershipRoles: { include: { role: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = await getMember(slug);
  if (!member) return {};
  return {
    title: `${member.name} — ${member.category.name}`,
    description:
      member.bio ?? `${member.name} of ${member.company.name}, ${member.category.name} in ${member.chapter.name}, Builders World Forum.`,
  };
}

function InfoBlock({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className={`mt-3 text-slate-300 ${multiline ? "whitespace-pre-line" : ""}`}>{value}</p>
    </div>
  );
}

export default async function MemberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await getMember(slug);
  if (!member) notFound();

  const contactItems = [
    { label: "Phone", value: member.phone, href: member.phone ? `tel:${member.phone}` : undefined },
    { label: "WhatsApp", value: member.whatsapp, href: member.whatsapp ? `https://wa.me/${member.whatsapp.replace(/\D/g, "")}` : undefined },
    { label: "Email", value: member.email, href: member.email ? `mailto:${member.email}` : undefined },
    { label: "Website", value: member.website, href: member.website ?? undefined },
  ].filter((item) => item.value);

  const socialLinks = [
    { label: "Instagram", href: member.instagramUrl },
    { label: "LinkedIn", href: member.linkedinUrl },
    { label: "Facebook", href: member.facebookUrl },
  ].filter((item) => item.href);

  // Brief §53 — LocalBusiness. A member profile is a business directory
  // listing (address, phone, service area, certifications) more than a
  // personal bio, so LocalBusiness fits better here than Person; Person is
  // used on /authors/[slug] instead, where the page is genuinely a bio.
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: member.name,
    description: member.bio || undefined,
    telephone: member.phone || undefined,
    email: member.email || undefined,
    address: member.address ? { "@type": "PostalAddress", streetAddress: member.address } : undefined,
    url: `${SITE_URL}/members/${member.slug}`,
    areaServed: member.areasServed || undefined,
  };

  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Members", path: "/members" },
    { name: member.name, path: `/members/${member.slug}` },
  ]);

  return (
    <div>
      <JsonLd data={localBusinessJsonLd} />
      <JsonLd data={crumbs} />
      <div className="relative">
        <MediaPlaceholder brief={`${member.name} — portrait or company work`} className="h-[40vh]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-navy-950/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-10">
          <SectionLabel>{member.category.name}</SectionLabel>
          <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">{member.name}</h1>
          <p className="mt-2 text-slate-400">
            {member.designation ? `${member.designation} · ` : ""}
            {member.company.name} · {member.chapter.name}
          </p>
          {member.leadershipRoles.length > 0 ? (
            <p className="mt-1 text-sm text-gold-400">
              {member.leadershipRoles.map((r) => r.role.label).join(" · ")}
            </p>
          ) : null}
        </Container>
      </div>

      <Container className="grid gap-16 py-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-14">
          <InfoBlock label="About" value={member.bio} multiline />
          <InfoBlock label="Services" value={member.services} multiline />
          <InfoBlock label="Specialisations" value={member.specialisations} multiline />
          <InfoBlock label="USP" value={member.usp} multiline />

          <div className="grid gap-8 sm:grid-cols-2">
            {member.yearsInBusiness ? (
              <div>
                <SectionLabel>Years in business</SectionLabel>
                <p className="mt-3 text-slate-300">{member.yearsInBusiness}</p>
              </div>
            ) : null}
            <InfoBlock label="Areas served" value={member.areasServed} />
            <InfoBlock label="Certifications" value={member.certifications} />
          </div>

          <InfoBlock label="Major projects" value={member.majorProjects} multiline />
          <InfoBlock label="Clientele" value={member.clientele} multiline />

          {member.brochureUrl || member.videoUrl ? (
            <div>
              <SectionLabel>Media</SectionLabel>
              <div className="mt-3 flex flex-col gap-2">
                {member.brochureUrl ? (
                  <a href={member.brochureUrl} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
                    Download brochure (PDF) →
                  </a>
                ) : null}
                {member.videoUrl ? (
                  <a href={member.videoUrl} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
                    Watch video →
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-8">
          {contactItems.length > 0 ? (
            <div className="rounded-sm border border-navy-700 p-6">
              <SectionLabel>Contact</SectionLabel>
              <div className="mt-4 flex flex-col gap-3">
                {contactItems.map((item) => (
                  <TrackedAnchor
                    key={item.label}
                    eventName="member_contact_click"
                    eventParams={{ method: item.label.toLowerCase(), memberSlug: member.slug }}
                    href={item.href}
                    target={item.label === "Website" ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="text-sm text-ivory-100 hover:text-gold-400"
                  >
                    {item.label}: {item.value}
                  </TrackedAnchor>
                ))}
              </div>
              {member.address ? <p className="mt-4 text-sm text-slate-400">{member.address}</p> : null}
              {member.googleMapsUrl ? (
                <TrackedAnchor
                  eventName="member_contact_click"
                  eventParams={{ method: "maps", memberSlug: member.slug }}
                  href={member.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-gold-400"
                >
                  View on Google Maps →
                </TrackedAnchor>
              ) : null}
            </div>
          ) : null}

          {socialLinks.length > 0 ? (
            <div className="rounded-sm border border-navy-700 p-6">
              <SectionLabel>Social</SectionLabel>
              <div className="mt-4 flex flex-col gap-2">
                {socialLinks.map((item) => (
                  <a key={item.label} href={item.href!} target="_blank" rel="noopener noreferrer" className="text-sm text-ivory-100 hover:text-gold-400">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <Button href={`/chapters/${member.chapter.slug}`} variant="secondary">
            View {member.chapter.name} →
          </Button>
        </aside>
      </Container>
    </div>
  );
}
