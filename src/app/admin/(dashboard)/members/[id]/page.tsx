import { notFound } from "next/navigation";
import Link from "next/link";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { EditMemberForm } from "@/components/admin/edit-member-form";
import { MemberPortalAccess } from "@/components/admin/member-portal-access";
import { ReviewProfileRevisionForm } from "@/components/admin/review-profile-revision-form";
import { MemberTestimonials } from "@/components/admin/member-testimonials";
import { MemberInductionForm } from "@/components/admin/member-induction-form";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const member = await db.member.findUnique({
    where: { id },
    include: { company: true, chapter: true, category: true, user: true },
  });
  if (!member) notFound();

  await requireChapterAccess(member.chapterId, "members:manage");

  const inductionCandidates = await db.member.findMany({
    where: { chapterId: member.chapterId, status: "ACTIVE", id: { not: member.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const pendingRevision = await db.memberProfileRevision.findFirst({
    where: { memberId: member.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const testimonials = await db.testimonial.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
  });

  // Visitor Management System (2026-09-18), spec §5: "Link each
  // member-invited visit to the inviting member profile ... distinguish
  // unique visitors from total visits." Read-only — no scoring logic here,
  // PointsConfig's existing VISITOR ActivityType (entered via Roster) stays
  // the actual mechanism for awarding points.
  const invitedVisits = await db.visitorAttendance.findMany({
    where: { invitingMemberId: member.id },
    include: { visitorProfile: true, meeting: true, chapter: true },
    orderBy: { createdAt: "desc" },
  });
  const uniqueVisitorCount = new Set(invitedVisits.map((v) => v.visitorProfileId)).size;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{member.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {member.chapter.name} · {member.category.name} · {member.company.name}
        </p>
        <Link href={`/members/${member.slug}`} target="_blank" className="mt-1 inline-block text-sm text-neutral-500 hover:text-neutral-900">
          View public profile /members/{member.slug} →
        </Link>
      </div>

      <MemberPortalAccess
        memberId={member.id}
        linkedUser={member.user ? { email: member.user.email, status: member.user.status } : null}
      />

      {pendingRevision ? (
        <ReviewProfileRevisionForm
          revisionId={pendingRevision.id}
          proposed={pendingRevision.changes as Record<string, unknown>}
          current={member}
        />
      ) : null}

      <EditMemberForm member={member} />

      <MemberInductionForm
        memberId={member.id}
        currentReferredByMemberId={member.referredByMemberId}
        candidates={inductionCandidates}
      />

      <MemberTestimonials memberId={member.id} testimonials={testimonials} />

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Visitors Invited</h2>
          <p className="text-xs text-neutral-500">
            {uniqueVisitorCount} unique visitor{uniqueVisitorCount === 1 ? "" : "s"} · {invitedVisits.length} total visit
            {invitedVisits.length === 1 ? "" : "s"}
          </p>
        </div>
        {invitedVisits.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No visitors invited yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {invitedVisits.map((visit) => (
              <li key={visit.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-neutral-900">{visit.visitorProfile.name}</p>
                  <p className="text-xs text-neutral-500">
                    {visit.chapter.name} · {visit.meeting.title} · {visit.meeting.startsAt.toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    visit.status === "PRESENT" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {visit.status === "PRESENT" ? "Present" : "Absent"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
