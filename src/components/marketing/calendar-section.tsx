import { getCalendarItems } from "@/lib/calendar/items";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { CalendarView } from "@/components/calendar/calendar-view";

/** Homepage calendar — every upcoming chapter meeting plus the events/activities the admin team adds. */
export async function CalendarSection() {
  const { items, todayKey } = await getCalendarItems({ admin: false });

  return (
    <section className="bg-emerald-950 py-24">
      <Container>
        <SectionLabel>Calendar</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          Meetings, events and activities across BWF.
        </p>
        <div className="mt-10">
          <CalendarView items={items} todayKey={todayKey} />
        </div>
      </Container>
    </section>
  );
}
