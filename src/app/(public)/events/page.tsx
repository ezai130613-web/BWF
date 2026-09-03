import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming Builders World Forum meetings, networking events, and seminars.",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  CHAPTER_MEETING: "Chapter Meeting",
  NETWORKING_EVENT: "Networking Event",
  SEMINAR: "Seminar",
  EXHIBITION: "Exhibition",
  CHAPTER_LAUNCH: "Chapter Launch",
  SPECIAL_EVENT: "Special Event",
};

export default async function EventsPage() {
  const events = await db.event.findMany({
    where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
    include: { chapter: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Events</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">Meetings &amp; Events</h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          Chapter meetings and BWF-wide events — register online to attend as a visitor.
        </p>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="group flex flex-col overflow-hidden rounded-sm border border-navy-700 transition-colors hover:border-gold-500/50"
            >
              <MediaPlaceholder brief={`${event.title} — event photo`} className="h-40" />
              <div className="flex flex-1 flex-col gap-2 p-5">
                <span className="text-xs uppercase tracking-wide text-gold-400">
                  {EVENT_TYPE_LABELS[event.eventType]}
                </span>
                <h2 className="font-display text-xl text-ivory-100 group-hover:text-gold-300">{event.title}</h2>
                <p className="text-sm text-slate-400">
                  {event.startsAt.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-sm text-slate-500">{event.chapter?.name ?? "All chapters"}</p>
              </div>
            </Link>
          ))}
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming events scheduled right now — check back soon.</p>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
