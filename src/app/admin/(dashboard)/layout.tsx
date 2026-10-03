import { cookies } from "next/headers";
import { requireAdminSession, getUserPermissionKeys } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import type { AdminWorkspace } from "@/app/admin/workspace/actions";
import { isAccountsOnly } from "@/lib/auth/constants";

const ADMIN_WORKSPACES: AdminWorkspace[] = ["website", "performance", "marketing", "accounts"];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  const cookieStore = await cookies();
  const workspaceCookie = cookieStore.get("bwf_admin_workspace")?.value;
  const accountsOnly = isAccountsOnly(session.user.roles);
  // An Accounts-only login has exactly one workspace regardless of cookie.
  const workspace: AdminWorkspace | null = accountsOnly
    ? "accounts"
    : ADMIN_WORKSPACES.includes(workspaceCookie as AdminWorkspace)
      ? (workspaceCookie as AdminWorkspace)
      : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={session.user.name ?? session.user.email ?? "Admin"}
        permissions={permissions}
        isChapterAdmin={session.user.roles.includes("CHAPTER_ADMIN")}
        workspace={workspace}
        canSwitchWorkspace={!accountsOnly}
      />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-neutral-200 bg-white px-8">
          <SignOutButton callbackUrl="/admin/login" />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
