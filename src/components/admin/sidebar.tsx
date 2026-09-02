"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles & Permissions" },
  { href: "/admin/activity", label: "Activity Log" },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col bg-navy-900 text-ivory-100">
      <div className="px-6 py-6">
        <p className="font-display text-base">Builders World Forum</p>
        <p className="mt-0.5 text-xs text-slate-400">Admin</p>
      </div>

      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-navy-700 text-gold-300" : "text-slate-400 hover:bg-navy-800 hover:text-ivory-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-700 px-6 py-4">
        <p className="truncate text-sm text-ivory-200">{userName}</p>
      </div>
    </aside>
  );
}
