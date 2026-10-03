import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ReauthGuard } from "@/components/admin/reauth-guard";
import { MemberCredentialsPanel, type CredentialMemberRow } from "@/components/admin/member-credentials-panel";

export default async function MemberCredentialsPage() {
  await requirePermission("users:manage");

  const members = await db.member.findMany({
    where: { status: "ACTIVE" },
    include: { chapter: true, category: true, user: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });

  const rows: CredentialMemberRow[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    chapter: m.chapter.name,
    category: m.category.name,
    state: !m.user ? "NONE" : m.user.mustChangePassword ? "PENDING" : "ACTIVATED",
    username: m.user?.username ?? null,
    email: m.user?.email ?? null,
    issuedAt: m.user?.temporaryPasswordIssuedAt?.toISOString() ?? null,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Member Login Credentials</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Issue temporary logins in bulk: username <strong>BWFCC</strong> + chapter number + serial (Chapter 1 →
          BWFCC101, BWFCC102…; Chapter 2 → BWFCC201…), temporary password <strong>1234</strong>. On first sign-in
          each member verifies their own email and sets a private password; the temporary password stops working
          for them at that moment. Until then anyone who knows a username could sign in as that member — ask
          members to activate promptly.
        </p>
      </div>
      <ReauthGuard>
        <MemberCredentialsPanel rows={rows} />
      </ReauthGuard>
    </div>
  );
}
