import Link from "next/link";
import { Cake, CalendarHeart, PartyPopper } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/member/ui";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { birthdayWishLink, getVisibleBirthdays, groupBirthdays, UPCOMING_BIRTHDAY_DAYS, type BirthdayPerson } from "@/lib/members/birthdays";

/**
 * Phase 37 — Socials: fellow members' birthdays (today, the next 30 days,
 * and the full year by month). Same member visibility as Find Members
 * Nearby; day + month only, never the year.
 */
export default async function SocialsPage() {
  const { member } = await requireMemberProfile();
  const people = await getVisibleBirthdays(member.id);
  const { today, upcoming, byMonth } = groupBirthdays(people);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={PartyPopper} title="Socials" description="Celebrate your fellow BWF members — birthdays today and coming up." />

      {!member.birthDay ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your birthday isn&rsquo;t on BWF yet.{" "}
          <Link href="/member/profile#birthday" className="font-semibold underline">
            Add it on My Profile
          </Link>{" "}
          so other members can wish you.
        </p>
      ) : null}

      <Card title="Today" icon={Cake}>
        {today.length > 0 ? <PeopleGrid people={today} highlight /> : <EmptyState icon={Cake} message="No birthdays today." />}
      </Card>

      <Card title={`Next ${UPCOMING_BIRTHDAY_DAYS} days`} icon={CalendarHeart}>
        {upcoming.length > 0 ? <PeopleGrid people={upcoming} /> : <EmptyState icon={CalendarHeart} message="No birthdays in the next 30 days." />}
      </Card>

      {byMonth.length > 0 ? (
        <Card title="All birthdays" description="By month">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {byMonth.map((group) => (
              <div key={group.month}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{group.name}</h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {group.people.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-neutral-800">
                        {p.name}
                        {p.isMe ? <span className="text-neutral-400"> (you)</span> : null}
                      </span>
                      <span className="flex-shrink-0 text-neutral-500">{p.day}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function whenLabel(daysAway: number) {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `In ${daysAway} days`;
}

function PeopleGrid({ people, highlight = false }: { people: BirthdayPerson[]; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {people.map((p) => {
        const wish = p.isMe ? null : birthdayWishLink(p);
        return (
          <article
            key={p.id}
            className={`flex gap-4 rounded-2xl border p-4 ${highlight ? "border-amber-300 bg-amber-50/60" : "border-neutral-200/80 bg-white"}`}
          >
            {p.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-pasted or R2 URL
              <img src={p.photoUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-900">
                {p.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-neutral-900">
                {p.name}
                {p.isMe ? <span className="font-normal text-neutral-400"> (you)</span> : null}
              </h2>
              <p className="text-sm text-neutral-700">{p.company}</p>
              <p className="text-xs text-neutral-500">
                {p.category} | {p.chapter}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-800">
                🎂 {p.label} · {whenLabel(p.daysAway)}
              </p>
              {wish ? (
                <a
                  href={wish}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Wish on WhatsApp
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
