import { CalendarDays, Clock, MapPin, Award } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatIst } from "@/lib/ist";
import { Card, EmptyState, PageHeader } from "@/components/member/ui";

export default async function MemberMeetingsPage() {
  const { member } = await requireMemberProfile();
  const now = new Date();

  const [upcoming, recent] = await Promise.all([
    db.meeting.findMany({
      where: { chapterId: member.chapterId, status: "SCHEDULED", startsAt: { gte: now } },
      include: { chiefGuest: { select: { name: true, designation: true, company: true } } },
      orderBy: { startsAt: "asc" },
      take: 12,
    }),
    db.meeting.findMany({
      where: { chapterId: member.chapterId, startsAt: { lt: now } },
      select: { id: true, title: true, startsAt: true, status: true },
      orderBy: { startsAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={CalendarDays} title="Meetings" description="Your chapter's upcoming meetings. Times are IST." />

      {upcoming.length === 0 ? (
        <Card>
          <EmptyState message="No upcoming meetings scheduled yet." icon={CalendarDays} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcoming.map((m, i) => (
            <article
              key={m.id}
              className={`flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm ${i === 0 ? "border-emerald-600 ring-1 ring-emerald-600/20" : "border-neutral-200/80"}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-800 text-white">
                  <span className="text-[10px] font-semibold uppercase text-gold-300">{formatIst(m.startsAt, { month: "short" })}</span>
                  <span className="text-xl font-semibold leading-none">{formatIst(m.startsAt, { day: "numeric" })}</span>
                </div>
                <div className="min-w-0">
                  {i === 0 ? <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Next meeting</p> : null}
                  <h2 className="font-semibold text-neutral-900">{m.title}</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-600">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatIst(m.startsAt, { weekday: "long", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <p className="flex items-start gap-1.5 text-sm text-neutral-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span>
                  {[m.venue, m.address].filter(Boolean).join(", ") || "Venue to be confirmed"}
                  {m.googleMapsUrl ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={m.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-800 underline">
                        Map
                      </a>
                    </>
                  ) : null}
                </span>
              </p>
              <p className="flex items-start gap-1.5 text-sm text-neutral-600">
                <Award className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span>
                  Chief Guest:{" "}
                  {m.chiefGuest ? (
                    <span className="font-medium text-neutral-900">
                      {[m.chiefGuest.name, m.chiefGuest.designation, m.chiefGuest.company].filter(Boolean).join(", ")}
                    </span>
                  ) : (
                    "Not announced yet"
                  )}
                </span>
              </p>
              {m.agenda ? <p className="text-sm text-neutral-500">{m.agenda}</p> : null}
            </article>
          ))}
        </div>
      )}

      {recent.length > 0 ? (
        <Card title="Recent meetings">
          <ul className="divide-y divide-neutral-100">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="text-neutral-900">{m.title}</span>
                <span className="text-neutral-500">
                  {formatIst(m.startsAt, { day: "numeric", month: "short", year: "numeric" })}
                  {m.status === "CANCELLED" ? " · Cancelled" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
