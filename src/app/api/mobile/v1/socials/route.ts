import { birthdayOf, birthdayWishLink, getVisibleBirthdays, groupBirthdays, UPCOMING_BIRTHDAY_DAYS, type BirthdayPerson } from "@/lib/members/birthdays";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { BirthdayRow, SocialsResponse } from "@/lib/mobile/contract";

function toRow(p: BirthdayPerson): BirthdayRow {
  return {
    id: p.id,
    name: p.name,
    photoUrl: p.photoUrl,
    company: p.company,
    category: p.category,
    chapter: p.chapter,
    day: p.day,
    month: p.month,
    label: p.label,
    daysAway: p.daysAway,
    isMe: p.isMe,
    wishUrl: p.isMe ? null : birthdayWishLink(p),
  };
}

/** Phase 37 — the app's Socials tab: same data as the portal's /member/socials. */
export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const { today, upcoming, byMonth } = groupBirthdays(await getVisibleBirthdays(member.id));

  const body: SocialsResponse = {
    today: today.map(toRow),
    upcoming: upcoming.map(toRow),
    upcomingDays: UPCOMING_BIRTHDAY_DAYS,
    byMonth: byMonth.map((g) => ({ month: g.month, name: g.name, people: g.people.map(toRow) })),
    myBirthday: birthdayOf(member),
  };
  return json(body);
});
