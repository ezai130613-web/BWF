"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Handshake,
  Receipt,
  Users,
  Rocket,
  UsersRound,
  ShoppingBag,
  Award,
  Trophy,
  BarChart3,
  FileBarChart,
  MapPin,
  CalendarDays,
  UserRound,
  FileText,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/member", label: "Dashboard", icon: LayoutDashboard },
      { href: "/member/meetings", label: "Meetings", icon: CalendarDays },
      { href: "/member/points", label: "My Points", icon: Trophy },
    ],
  },
  {
    title: "Record activity",
    items: [
      { href: "/member/referrals", label: "Referrals", icon: Handshake },
      { href: "/member/thank-you-slips", label: "Thank You Slips", icon: Receipt },
      { href: "/member/one-to-ones", label: "One-to-Ones", icon: Users },
      { href: "/member/power-dates", label: "Power Dates", icon: Rocket },
      { href: "/member/conclaves", label: "Conclaves", icon: UsersRound },
      { href: "/member/consumers", label: "Consumers", icon: ShoppingBag },
      { href: "/member/chief-guests-brought", label: "Chief Guests", icon: Award },
    ],
  },
  {
    title: "Insights & network",
    items: [
      { href: "/member/reports", label: "My Activity", icon: BarChart3 },
      { href: "/member/detailed-reports", label: "Detailed Reports", icon: FileBarChart },
      { href: "/member/search", label: "Find Members Nearby", icon: MapPin },
    ],
  },
  {
    title: "You",
    items: [
      { href: "/member/profile", label: "My Profile", icon: UserRound },
      { href: "/member/articles", label: "Articles", icon: FileText },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/member" ? pathname === "/member" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 px-3" aria-label="Member portal">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600/90">{group.title}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-emerald-700/70 text-gold-300" : "text-ivory-200/80 hover:bg-emerald-800 hover:text-ivory-100",
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/member" className="flex items-center gap-3">
      <Image src="/images/brand/bwf-logo-512.png" alt="" width={34} height={34} className="h-8.5 w-8.5" />
      <div className="leading-tight">
        <p className="font-display text-[15px] text-ivory-100">Builders World Forum</p>
        <p className="text-[11px] uppercase tracking-[0.15em] text-gold-400">Member Portal</p>
      </div>
    </Link>
  );
}

function AccountBlock({ memberName, subtitle }: { memberName: string; subtitle: string }) {
  return (
    <div className="border-t border-emerald-800 px-5 py-4">
      <p className="truncate text-sm font-medium text-ivory-100">{memberName}</p>
      <p className="truncate text-xs text-ivory-200/60">{subtitle}</p>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/member/login" })}
        className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-ivory-200/80 hover:text-gold-300"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
      </button>
    </div>
  );
}

export function PortalNav({ memberName, subtitle }: { memberName: string; subtitle: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-emerald-900 to-emerald-950 lg:flex">
        <div className="px-6 py-6">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          <NavLinks pathname={pathname} />
        </div>
        <AccountBlock memberName={memberName} subtitle={subtitle} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-emerald-900 px-4 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-lg p-2 text-ivory-100 hover:bg-emerald-800"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-emerald-900 to-emerald-950 shadow-xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-ivory-100 hover:bg-emerald-800">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <AccountBlock memberName={memberName} subtitle={subtitle} />
          </div>
        </div>
      ) : null}
    </>
  );
}
