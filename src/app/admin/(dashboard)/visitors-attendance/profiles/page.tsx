import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { LinkVisitorToMemberForm } from "@/components/admin/link-visitor-to-member-form";

const SOURCE_LABELS: Record<string, string> = {
  INVITED_BY_MEMBER: "Invited by member",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  GOOGLE_SEARCH: "Google Search",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  OTHER: "Other",
};

/**
 * Spec: "Provide visitor-wise history across chapters and meetings...
 * Recognise returning visitors using verified identifiers; never merge
 * people by name alone." Search is by phone or name; the dedup itself
 * already happened at check-in time (see findOrCreateVisitorProfile), so
 * every VisitorProfile row here is already a distinct, verified person.
 */
export default async function VisitorProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; visitorProfileId?: string }>;
}) {
  const scope = await getChapterScope("attendance:manage");
  const params = await searchParams;

  const [selectedProfile, matches] = await Promise.all([
    params.visitorProfileId ? db.visitorProfile.findUnique({ where: { id: params.visitorProfileId } }) : null,
    !params.visitorProfileId && params.q
      ? db.visitorProfile.findMany({
          where: { OR: [{ name: { contains: params.q, mode: "insensitive" } }, { phone: { contains: params.q } }] },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [],
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Visitors Attendance — Visitor-wise View</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Search a visitor by name or phone to see their full history across chapters and
            meetings.
          </p>
        </div>
        <Link href="/admin/visitors-attendance" className="text-sm text-neutral-600 underline hover:text-neutral-900">
          ← Meeting-wise view
        </Link>
      </div>

      {!selectedProfile ? (
        <>
          <form action="/admin/visitors-attendance/profiles" method="GET" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Name or phone
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Search visitors…"
                className="w-full min-w-[16rem] rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
              Search
            </button>
          </form>

          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {matches.map((profile) => (
              <li key={profile.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{profile.name}</p>
                  <p className="text-xs text-neutral-500">{profile.phone}</p>
                </div>
                <Link
                  href={`/admin/visitors-attendance/profiles?visitorProfileId=${profile.id}`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
                >
                  View history
                </Link>
              </li>
            ))}
            {matches.length === 0 && params.q ? (
              <li className="px-4 py-8 text-center text-sm text-neutral-400">No visitors matched.</li>
            ) : null}
          </ul>
        </>
      ) : (
        <ProfileHistory profile={selectedProfile} scope={scope} />
      )}
    </div>
  );
}

async function ProfileHistory({
  profile,
  scope,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof db.visitorProfile.findUnique>>>;
  scope: "ALL" | string;
}) {
  const where: Prisma.VisitorAttendanceWhereInput = {
    visitorProfileId: profile.id,
    ...(scope === "ALL" ? {} : { chapterId: scope }),
  };

  const [attendances, convertedMember, members] = await Promise.all([
    db.visitorAttendance.findMany({
      where,
      include: { meeting: true, chapter: true, invitingMember: { select: { name: true } }, payment: true },
      orderBy: { createdAt: "desc" },
    }),
    profile.convertedMemberId
      ? db.member.findUnique({ where: { id: profile.convertedMemberId }, select: { name: true, chapter: { select: { name: true } } } })
      : null,
    db.member.findMany({
      where: { status: "ACTIVE", ...(scope === "ALL" ? {} : { chapterId: scope }) },
      select: { id: true, name: true, chapter: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalVisits = attendances.length;
  const chaptersVisited = new Set(attendances.map((a) => a.chapterId)).size;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/visitors-attendance/profiles" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Search a different visitor
      </Link>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">{profile.name}</h2>
        <p className="text-sm text-neutral-600">
          {profile.phone}
          {profile.companyName ? ` · ${profile.companyName}` : ""}
          {profile.businessCategory ? ` · ${profile.businessCategory}` : ""}
        </p>

        <div className="mt-4">
          {convertedMember ? (
            <p className="text-sm font-medium text-emerald-700">
              Converted to member: {convertedMember.name} ({convertedMember.chapter.name})
            </p>
          ) : (
            <LinkVisitorToMemberForm visitorProfileId={profile.id} members={members} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <StatCard label="Total Visits" value={totalVisits} />
        <StatCard label="Chapters Visited" value={chaptersVisited} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Meeting</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Attendance</th>
              <th className="px-4 py-3 font-medium">Inviter / Source</th>
              <th className="px-4 py-3 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {attendances.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-neutral-900">{a.meeting.title}</td>
                <td className="px-4 py-3 text-neutral-600">{a.chapter.name}</td>
                <td className="px-4 py-3 text-neutral-600">{a.meeting.startsAt.toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3 text-neutral-600">{a.status === "PRESENT" ? "Present" : "Absent"}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {a.source === "INVITED_BY_MEMBER" ? a.invitingMember?.name ?? "—" : SOURCE_LABELS[a.source]}
                </td>
                <td className="px-4 py-3 text-neutral-600">{a.payment ? `₹${a.payment.amountInr} — ${a.payment.status}` : "—"}</td>
              </tr>
            ))}
            {attendances.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No visits recorded.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
