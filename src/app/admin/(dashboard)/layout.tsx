import { requireAdminSession } from "@/lib/auth/rbac";
import { Sidebar } from "@/components/admin/sidebar";
import { SignOutButton } from "@/components/admin/sign-out-button";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={session.user.name ?? session.user.email ?? "Admin"} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-neutral-200 bg-white px-8">
          <SignOutButton />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
