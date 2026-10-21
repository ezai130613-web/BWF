import { cookies } from "next/headers";
import { requireAdminSession, getUserPermissionKeys } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/admin/sidebar";
import { fixedWorkspaceFor, type AdminWorkspace } from "@/lib/auth/constants";

const ADMIN_WORKSPACES: AdminWorkspace[] = ["website", "performance", "marketing", "accounts"];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  const cookieStore = await cookies();
  const workspaceCookie = cookieStore.get("bwf_admin_workspace")?.value;
  // Single-workspace roles (Accounts, Website/Membership/Marketing Admin)
  // have exactly one workspace regardless of cookie.
  const fixedWorkspace = fixedWorkspaceFor(session.user.roles);
  const workspace: AdminWorkspace | null = fixedWorkspace
    ? fixedWorkspace
    : ADMIN_WORKSPACES.includes(workspaceCookie as AdminWorkspace)
      ? (workspaceCookie as AdminWorkspace)
      : null;

  return (
    <div className="min-h-screen bg-[#f5f7f4] print:bg-white">
      <Sidebar
        userName={session.user.name ?? session.user.email ?? "Admin"}
        permissions={permissions}
        isChapterAdmin={session.user.roles.includes("CHAPTER_ADMIN")}
        workspace={workspace}
        canSwitchWorkspace={!fixedWorkspace}
      />
      <div className="lg:pl-64 print:pl-0">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
