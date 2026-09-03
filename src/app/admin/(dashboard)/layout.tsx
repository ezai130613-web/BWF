import { requireAdminSession, getUserPermissionKeys } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={session.user.name ?? session.user.email ?? "Admin"}
        permissions={permissions}
        isChapterAdmin={session.user.roles.includes("CHAPTER_ADMIN")}
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
