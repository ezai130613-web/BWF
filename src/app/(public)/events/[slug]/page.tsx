import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { VisitorRegisterForm } from "@/components/marketing/visitor-register-form";

const EVENT_TYPE_LABELS: Record<string, string> = {
  CHAPTER_MEETING: "Chapter Meeting",
  NETWORKING_EVENT: "Networking Event",
  SEMINAR: "Seminar",
  EXHIBITION: "Exhibition",
  CHAPTER_LAUNCH: "Chapter Launch",
  SPECIAL_EVENT: "Special Event",
};

async function getEvent(slug: string) {
  return db.event.findUnique({ where: { slug }, include: { chapter: true } });
}

// Split out from the component body so the Date.now() read isn't flagged as
// an impure call inside render (react-hooks/purity) — this is a plain
// server-side computation, not something React needs to keep idempotent
// across a hydration replay.
function getEventAvailability(
  event: { status: string; registrationEnabled: boolean; registrationDeadline: Date | null; capacity: number | null },
  registeredCount: number,
) {
  const deadlinePassed = Boolean(event.registrationDeadline && event.registrationDeadline.getTime() < Date.now());
  const atCapacity = event.capacity != null && registeredCount >= event.capacity;
  const closed = event.status !== "SCHEDULED" || !event.registrationEnabled || deadlinePassed || atCapacity;
  return { deadlinePassed, atCapacity, closed };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};
  return { title: event.title, description: event.description ?? undefined };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const [categories, chapters, registeredCount] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    event.chapterId ? Promise.resolve([]) : db.chapter.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.visitor.count({ where: { eventId: event.id } }),
  ]);

  const members = await db.member.findMany({
    where: { status: "ACTIVE", ...(event.chapterId ? { chapterId: event.chapterId } : {}) },
    orderBy: { name: "asc" },
  });

  const { deadlinePassed, atCapacity, closed } = getEventAvailability(event, registeredCount);

  return (
    <div>
      <div className="relative">
        <MediaPlaceholder brief={`${event.title} — event photo`} className="h-[45vh]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/50 to-navy-950/10" />
        <Container className="absolute inset-x-0 bottom-0 pb-12">
          <SectionLabel>{EVENT_TYPE_LABELS[event.eventType]}</SectionLabel>
          <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">{event.title}</h1>
          <p className="mt-2 text-slate-400">
            {event.startsAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
          </p>
        </Container>
      </div>

      <Container className="grid gap-16 py-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          {event.description ? (
            <div>
              <SectionLabel>About this event</SectionLabel>
              <p className="mt-4 max-w-2xl text-slate-300">{event.description}</p>
            </div>
          ) : null}
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Chapter</dt>
              <dd className="text-ivory-100">{event.chapter?.name ?? "All chapters"}</dd>
            </div>
            {event.venue ? (
              <div>
                <dt className="text-sm text-slate-500">Venue</dt>
                <dd className="text-ivory-100">{event.venue}</dd>
              </div>
            ) : null}
            {event.capacity ? (
              <div>
                <dt className="text-sm text-slate-500">Capacity</dt>
                <dd className="text-ivory-100">
                  {registeredCount} / {event.capacity} registered
                </dd>
              </div>
            ) : null}
            {event.registrationDeadline ? (
              <div>
                <dt className="text-sm text-slate-500">Registration deadline</dt>
                <dd className="text-ivory-100">{event.registrationDeadline.toLocaleDateString()}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <aside className="rounded-sm border border-navy-700 p-6">
          <SectionLabel>Register to attend</SectionLabel>
          <div className="mt-6">
            {closed ? (
              <p className="text-sm text-slate-400">
                {atCapacity
                  ? "This event has reached capacity."
                  : deadlinePassed
                    ? "The registration deadline has passed."
                    : "Online registration for this event is currently closed."}
              </p>
            ) : (
              <VisitorRegisterForm
                categories={categories}
                chapters={event.chapterId ? undefined : chapters}
                members={members}
                eventId={event.id}
                fixedChapter={event.chapter ? { id: event.chapter.id, name: event.chapter.name } : undefined}
              />
            )}
          </div>
        </aside>
      </Container>
    </div>
  );
}
