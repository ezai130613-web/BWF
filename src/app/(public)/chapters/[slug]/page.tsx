import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { Button } from "@/components/ui/button";

async function getChapter(slug: string) {
  return db.chapter.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      members: { where: { status: "ACTIVE" }, include: { category: true, company: true }, orderBy: { name: "asc" } },
      leadership: { include: { member: true, role: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await getChapter(slug);
  if (!chapter) return {};
  return { title: chapter.name };
}

export default async function ChapterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = await getChapter(slug);
  if (!chapter) notFound();

  const occupiedCategoryIds = new Set(chapter.members.map((m) => m.categoryId));
  const availableCategories = await db.category.findMany({
    where: { isActive: true, id: { notIn: [...occupiedCategoryIds] } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="relative">
        <MediaPlaceholder brief={`${chapter.name} — cinematic hero, meeting venue or member work`} className="h-[50vh]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/50 to-navy-950/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-12">
          <SectionLabel>Chapter</SectionLabel>
          <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">{chapter.name}</h1>
          <p className="mt-2 text-slate-400">{chapter.location ?? "Chennai"}</p>
        </Container>
      </div>

      <Container className="grid gap-16 py-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-16">
          {chapter.description ? (
            <div>
              <SectionLabel>About this chapter</SectionLabel>
              <p className="mt-4 max-w-2xl text-slate-300">{chapter.description}</p>
            </div>
          ) : null}

          {chapter.leadership.length > 0 ? (
            <div>
              <SectionLabel>Leadership</SectionLabel>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {chapter.leadership.map((entry) => (
                  <div key={entry.id} className="rounded-sm border border-navy-700 p-4">
                    <p className="text-ivory-100">{entry.member.name}</p>
                    <p className="mt-1 text-sm text-gold-400">{entry.role.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <SectionLabel>Members</SectionLabel>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {chapter.members.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.slug}`}
                  className="rounded-sm border border-navy-700 p-4 transition-colors hover:border-gold-500/50"
                >
                  <p className="text-ivory-100">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {member.category.name} · {member.company.name}
                  </p>
                </Link>
              ))}
              {chapter.members.length === 0 ? (
                <p className="text-sm text-slate-500">No members listed yet.</p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-8">
          {(chapter.meetingSchedule || chapter.meetingVenue) ? (
            <div className="rounded-sm border border-navy-700 p-6">
              <SectionLabel>Meetings</SectionLabel>
              {chapter.meetingSchedule ? <p className="mt-4 text-ivory-100">{chapter.meetingSchedule}</p> : null}
              {chapter.meetingVenue ? <p className="mt-1 text-sm text-slate-400">{chapter.meetingVenue}</p> : null}
              {chapter.meetingAddress ? <p className="mt-1 text-sm text-slate-400">{chapter.meetingAddress}</p> : null}
              {chapter.googleMapsUrl ? (
                <a href={chapter.googleMapsUrl} className="mt-3 inline-block text-sm text-gold-400" target="_blank" rel="noopener noreferrer">
                  View on Google Maps →
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-sm border border-navy-700 p-6">
            <SectionLabel>Available categories</SectionLabel>
            <div className="mt-4 flex flex-wrap gap-2">
              {availableCategories.map((category) => (
                <span key={category.id} className="rounded-full border border-gold-500/40 px-3 py-1 text-xs text-gold-300">
                  {category.name}
                </span>
              ))}
              {availableCategories.length === 0 ? (
                <p className="text-sm text-slate-500">No open categories in this chapter right now.</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button href="/apply" variant="primary">
              Apply for Membership
            </Button>
          </div>
        </aside>
      </Container>
    </div>
  );
}
