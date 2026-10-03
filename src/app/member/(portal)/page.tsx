import Link from "next/link";
import {
  Handshake,
  Receipt,
  Users,
  Rocket,
  CalendarDays,
  Trophy,
  BarChart3,
  MapPin,
  ArrowRight,
  Clock,
  Building2,
  UserRound,
  FileText,
  IndianRupee,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { computeMemberScore } from "@/lib/points/score";
import { getActivityStats } from "@/lib/points/activity-stats";
import { formatInr } from "@/lib/format";
import { formatIst, istParts, istToUtc } from "@/lib/ist";
import { Card, StatTile } from "@/components/member/ui";
import { SignOutEverywhereButton } from "@/components/member/sign-out-everywhere-button";

const QUICK_ACTIONS: { href: string; label: string; hint: string; icon: LucideIcon; primary?: boolean }[] = [
  { href: "/member/referrals#record", label: "Give Referral", hint: "Pass business to a member", icon: Handshake, primary: true },
  { href: "/member/thank-you-slips#record", label: "Add Thank You Slip", hint: "Record business received", icon: Receipt, primary: true },
  { href: "/member/one-to-ones#record", label: "Record 1-to-1", hint: "Log a one-to-one meeting", icon: Users, primary: true },
  { href: "/member/power-dates#record", label: "Add Power Date", hint: "Took a member to a contact", icon: Rocket, primary: true },
  { href: "/member/meetings", label: "View Meetings", hint: "Upcoming chapter meetings", icon: CalendarDays },
  { href: "/member/points", label: "View My Points", hint: "Score & breakdown", icon: Trophy },
  { href: "/member/reports", label: "View My Activity", hint: "Weekly & period reports", icon: BarChart3 },
  { href: "/member/search", label: "Find Members Nearby", hint: "Within 5 km of a place", icon: MapPin },
];

export default async function MemberDashboardPage() {
  const { member } = await requireMemberProfile();

  const now = new Date();
  const { year, month } = istParts(now);
  const monthStart = istToUtc(year, month, 1);

  const [chapter, category, company, pendingRevision, nextMeeting] = await Promise.all([
    db.chapter.findUniqueOrThrow({ where: { id: member.chapterId } }),
    db.category.findUniqueOrThrow({ where: { id: member.categoryId } }),
    db.company.findUniqueOrThrow({ where: { id: member.companyId } }),
    db.memberProfileRevision.findFirst({ where: { memberId: member.id, status: "PENDING" } }),
    db.meeting.findFirst({
      where: { chapterId: member.chapterId, status: "SCHEDULED", startsAt: { gte: now } },
      include: { chiefGuest: { select: { name: true, company: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  // Sequential on purpose: each of these fans out ~10 queries, and the app's
  // connection pool is small.
  const score = await computeMemberScore(member.id);
  const thisMonth = await getActivityStats(member.id, monthStart);

  const firstName = member.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-6 text-ivory-100 shadow-md sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-500/10 blur-2xl" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">Welcome back</p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl">{firstName}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ivory-200/85">
              <span>{category.name}</span>
              <span aria-hidden>·</span>
              <span>{chapter.name}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                {company.name}
              </span>
            </p>
          </div>
          <Link
            href="/member/points"
            className="group flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
          >
            <Trophy className="h-8 w-8 text-gold-400" aria-hidden />
            <div>
              <p className="text-xs uppercase tracking-wide text-ivory-200/75">Overall BWF Score</p>
              <p className="text-3xl font-semibold text-white">{score.total}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-ivory-200/70 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`group flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
                a.primary ? "border-emerald-200 bg-white hover:border-emerald-600" : "border-neutral-200/80 bg-white hover:border-emerald-600"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  a.primary ? "bg-emerald-800 text-gold-300" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                <a.icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-neutral-900">{a.label}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">{a.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* This month */}
        <div className="flex flex-col gap-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              This month · {formatIst(now, { month: "long", year: "numeric" })}
            </h2>
            <Link href="/member/reports" className="text-xs font-medium text-emerald-800 hover:underline">
              Full report →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Referrals given" value={thisMonth.referralsGiven} icon={Handshake} />
            <StatTile label="Referrals received" value={thisMonth.referralsReceived} icon={Handshake} />
            <StatTile label="Business received" value={formatInr(String(thisMonth.businessReceivedInr)) ?? "₹0"} icon={IndianRupee} />
            <StatTile label="Business given" value={formatInr(String(thisMonth.businessGivenInr)) ?? "₹0"} icon={IndianRupee} />
            <StatTile label="One-to-ones" value={thisMonth.oneToOnes} icon={Users} />
            <StatTile label="Power dates" value={thisMonth.powerDates} icon={Rocket} />
          </div>
        </div>

        {/* Next meeting */}
        <Card title="Next chapter meeting" icon={CalendarDays} action={<Link href="/member/meetings" className="text-xs font-medium text-emerald-800 hover:underline">All →</Link>}>
          {nextMeeting ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-50 text-emerald-900">
                  <span className="text-[10px] font-semibold uppercase">{formatIst(nextMeeting.startsAt, { month: "short" })}</span>
                  <span className="text-xl font-semibold leading-none">{formatIst(nextMeeting.startsAt, { day: "numeric" })}</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{nextMeeting.title}</p>
                  <p className="flex items-center gap-1 text-sm text-neutral-600">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatIst(nextMeeting.startsAt, { weekday: "long", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <p className="flex items-start gap-1.5 text-sm text-neutral-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                {[nextMeeting.venue, nextMeeting.address].filter(Boolean).join(", ") || "Venue to be confirmed"}
              </p>
              <p className="text-sm text-neutral-600">
                Chief Guest:{" "}
                <span className="font-medium text-neutral-900">
                  {nextMeeting.chiefGuest ? nextMeeting.chiefGuest.name : "Not announced yet"}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No upcoming meeting scheduled yet.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Your profile" icon={UserRound}>
          <p className="text-sm text-neutral-600">
            Your public profile is at{" "}
            <Link href={`/members/${member.slug}`} target="_blank" className="font-medium text-emerald-800 underline">
              /members/{member.slug}
            </Link>
            . Changes you request are reviewed by BWF before they go live.
          </p>
          {pendingRevision ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Edit request awaiting review — submitted {pendingRevision.createdAt.toLocaleDateString("en-IN")}.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/member/profile" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              View / edit profile
            </Link>
            <Link href="/member/articles" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-emerald-700">
              <FileText className="h-4 w-4" aria-hidden /> Articles
            </Link>
          </div>
        </Card>
        <Card title="Account & security" icon={ShieldCheck}>
          <p className="text-sm text-neutral-600">
            Lost a phone or signed in on a shared computer? Sign out everywhere — you&rsquo;ll need your password again on
            every device.
          </p>
          <div className="mt-4">
            <SignOutEverywhereButton />
          </div>
        </Card>
      </div>
    </div>
  );
}
