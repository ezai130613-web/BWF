import Link from "next/link";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_LINKS = [
  { href: "/member", label: "Dashboard" },
  { href: "/member/profile", label: "My Profile" },
  { href: "/member/articles", label: "Articles" },
  { href: "/member/referrals", label: "Referrals" },
  { href: "/member/thank-you-slips", label: "Thank You Slips" },
  { href: "/member/one-to-ones", label: "One-to-Ones" },
  { href: "/member/power-dates", label: "Power Dates" },
  { href: "/member/conclaves", label: "Conclaves" },
  { href: "/member/points", label: "Points & Score" },
  { href: "/member/reports", label: "Reports" },
  { href: "/member/detailed-reports", label: "Detailed Reports" },
  { href: "/member/search", label: "Find a Member" },
];

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const { member } = await requireMemberProfile();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-8">
          <p className="font-medium text-neutral-900">Builders World Forum</p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-500">{member.name}</span>
            <SignOutButton callbackUrl="/member/login" />
          </div>
        </div>
        {/* Nav grows as more app features land — horizontal scroll rather than
            a fixed-height row so more links never overlap/clip (a real bug
            hit once One-to-One/Power Date/Conclave pushed this past 8 items). */}
        <nav className="flex items-center gap-6 overflow-x-auto whitespace-nowrap border-t border-neutral-100 px-8 py-2.5 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="flex-shrink-0 text-neutral-600 hover:text-neutral-900">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-8 py-10">{children}</main>
    </div>
  );
}
