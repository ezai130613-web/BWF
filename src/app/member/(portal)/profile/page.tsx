import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RequestProfileEditForm } from "@/components/member/request-profile-edit-form";

export default async function MemberProfilePage() {
  const { member } = await requireMemberProfile();

  const pendingRevision = await db.memberProfileRevision.findFirst({
    where: { memberId: member.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">My Profile</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Edits here don&rsquo;t go live immediately — BWF admin reviews every change before it becomes public
          (brief §20).
        </p>
      </div>

      {pendingRevision ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-900">
            You have an edit request awaiting review, submitted {pendingRevision.createdAt.toLocaleString()}.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            You can submit a new request once this one has been reviewed. Your public profile still shows your
            last approved information in the meantime.
          </p>
        </div>
      ) : (
        <RequestProfileEditForm member={member} />
      )}
    </div>
  );
}
