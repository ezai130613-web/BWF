import { UserRound } from "lucide-react";
import { PageHeader } from "@/components/member/ui";
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
      <PageHeader
        icon={UserRound}
        title="My Profile"
        description="Edits here don't go live immediately — BWF reviews every change before it becomes public."
      />

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
