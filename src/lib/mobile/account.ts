import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { getBooleanSetting } from "@/lib/settings";
import { hasTemporaryUsername } from "@/lib/auth/member-credentials";
import type { User } from "@/generated/prisma/client";
import type { MemberSummary, MeetingSummary, MobileAccount } from "@/lib/mobile/contract";

export function memberProfileUrl(slug: string) {
  return `${SITE_URL}/members/${slug}`;
}

export async function getMemberSummary(memberId: string): Promise<MemberSummary> {
  const m = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      slug: true,
      photoUrl: true,
      designation: true,
      company: { select: { name: true } },
      chapter: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
  return {
    id: m.id,
    name: m.name,
    slug: m.slug,
    photoUrl: m.photoUrl,
    designation: m.designation,
    company: m.company.name,
    chapter: m.chapter.name,
    category: m.category.name,
    profileUrl: memberProfileUrl(m.slug),
  };
}

export async function getMobileAccount(user: User): Promise<MobileAccount> {
  const member = await db.member.findUnique({ where: { userId: user.id }, select: { id: true } });
  return {
    userId: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    mustActivate: user.mustChangePassword,
    mustChooseUsername: user.mustChangePassword && hasTemporaryUsername(user.username),
    activationRequiresEmailCode: user.mustChangePassword ? await getBooleanSetting("memberActivation.requireEmailCode") : false,
    member: member ? await getMemberSummary(member.id) : null,
  };
}

type MeetingWithGuest = {
  id: string;
  title: string;
  startsAt: Date;
  status: MeetingSummary["status"];
  venue: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  agenda: string | null;
  chiefGuest: { name: string; designation?: string | null; company: string | null } | null;
};

export function toMeetingSummary(m: MeetingWithGuest): MeetingSummary {
  return {
    id: m.id,
    title: m.title,
    startsAt: m.startsAt.toISOString(),
    status: m.status,
    venue: m.venue,
    address: m.address,
    googleMapsUrl: m.googleMapsUrl,
    agenda: m.agenda,
    chiefGuest: m.chiefGuest
      ? { name: m.chiefGuest.name, designation: m.chiefGuest.designation ?? null, company: m.chiefGuest.company }
      : null,
  };
}
