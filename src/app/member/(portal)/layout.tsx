import Link from "next/link";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { SignOutButton } from "@/components/sign-out-button";

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const { member } = await requireMemberProfile();

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-8">
        <div className="flex items-center gap-8">
          <p className="font-medium text-neutral-900">Builders World Forum</p>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/member" className="text-neutral-600 hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/member/profile" className="text-neutral-600 hover:text-neutral-900">
              My Profile
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">{member.name}</span>
          <SignOutButton callbackUrl="/member/login" />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-8 py-10">{children}</main>
    </div>
  );
}
