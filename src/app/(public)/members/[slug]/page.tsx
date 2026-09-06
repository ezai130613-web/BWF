import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { Button } from "@/components/ui/button";
import { TrackedAnchor } from "@/components/analytics/tracked-anchor";
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";
import type { GalleryEntry } from "@/lib/members/profile-fields";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

async function getMember(slug: string) {
  return db.member.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      company: true,
      chapter: true,
      category: true,
      leadershipRoles: { include: { role: true } },
      testimonials: { where: { status: "APPROVED" }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] },
    },
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

  const photos: GalleryEntry[] = Array.isArray(member.photos) ? (member.photos as GalleryEntry[]) : [];
  const videos: GalleryEntry[] = Array.isArray(member.videos) ? (member.videos as GalleryEntry[]) : [];
  const successStories = member.testimonials.filter((t) => t.type === "SUCCESS_STORY");
  const otherTestimonials = member.testimonials.filter((t) => t.type !== "SUCCESS_STORY");

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
        <PhotoSlot
          src={member.photoUrl}
          alt={member.name}
          brief={`${member.name} — portrait or company work`}
          className="h-[40vh]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-emerald-950/10" />
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

          {photos.length > 0 ? (
            <div>
              <SectionLabel>Photos</SectionLabel>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {photos.map((photo, i) => (
                  <figure key={i} className="overflow-hidden rounded-sm border border-emerald-700">
                    {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-uploaded/R2 URL, not a next/image-managed asset */}
                    <img src={photo.url} alt={photo.caption || member.name} className="aspect-[4/3] w-full object-cover" />
                    {photo.caption ? <figcaption className="p-2 text-xs text-slate-400">{photo.caption}</figcaption> : null}
                  </figure>
                ))}
              </div>
            </div>
          ) : null}

          {videos.length > 0 ? (
            <div>
              <SectionLabel>Videos</SectionLabel>
              <div className="mt-3 flex flex-col gap-2">
                {videos.map((video, i) => (
                  <a key={i} href={video.url} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
                    {video.caption || "Watch video"} →
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {otherTestimonials.length > 0 ? (
            <div>
              <SectionLabel>What people say</SectionLabel>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {otherTestimonials.map((t) => (
                  <div key={t.id} className="rounded-sm border border-emerald-700 p-5">
                    <p className="text-slate-300">&ldquo;{t.content}&rdquo;</p>
                    <p className="mt-3 text-sm text-ivory-100">{t.name}</p>
                    {t.role || t.company ? (
                      <p className="text-xs text-slate-400">{[t.role, t.company].filter(Boolean).join(" · ")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {successStories.length > 0 ? (
            <div>
              <SectionLabel>Success stories</SectionLabel>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {successStories.map((t) => (
                  <div key={t.id} className="rounded-sm border border-emerald-700 p-5">
                    <p className="text-slate-300">&ldquo;{t.content}&rdquo;</p>
                    <p className="mt-3 text-sm text-ivory-100">{t.name}</p>
                    {t.role || t.company ? (
                      <p className="text-xs text-slate-400">{[t.role, t.company].filter(Boolean).join(" · ")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-8">
          {contactItems.length > 0 ? (
            <div className="rounded-sm border border-emerald-700 p-6">
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
            <div className="rounded-sm border border-emerald-700 p-6">
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
