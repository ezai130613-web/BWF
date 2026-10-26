import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ReauthGuard } from "@/components/admin/reauth-guard";
import { MemberCredentialsPanel, type CredentialMemberRow } from "@/components/admin/member-credentials-panel";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { ExportButton } from "@/components/admin/export-button";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Member Login Credentials</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Issue temporary logins in bulk: username <strong>BWFCC</strong> + chapter number + serial (Chapter 1 →
            BWFCC101, BWFCC102…; Chapter 2 → BWFCC201…), each with its own temporary password (like{" "}
            <strong>mango-4821</strong>), shown once and downloadable as a PDF. On first sign-in each member verifies
            their own email and sets a private password; the temporary password stops working for them at that
            moment. Passwords can&rsquo;t be looked up later — only reset.
          </p>
        </div>
        <ExportButton dataset="member-logins" label="Download login list" />
      </div>
      <ReauthGuard>
        <MemberCredentialsPanel rows={rows} />
      </ReauthGuard>
    </div>
  );
}
