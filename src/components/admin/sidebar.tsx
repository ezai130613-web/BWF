"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", permission: null },
  { href: "/admin/chapters", label: "Chapters", permission: "chapters:manage" },
  { href: "/admin/companies", label: "Companies", permission: "companies:manage" },
  { href: "/admin/categories", label: "Categories", permission: "categories:manage" },
  { href: "/admin/members", label: "Members", permission: "members:manage" },
  { href: "/admin/applications", label: "Applications", permission: "applications:manage" },
  { href: "/admin/blogs", label: "Blog", permission: "blogs:manage" },
  { href: "/admin/blog-categories", label: "Blog Categories", permission: "blogs:manage" },
  { href: "/admin/authors", label: "Authors", permission: "blogs:manage" },
  { href: "/admin/testimonials", label: "Testimonials", permission: "testimonials:manage" },
  { href: "/admin/content", label: "Website Content", permission: "content:manage" },
  { href: "/admin/faqs", label: "FAQs", permission: "content:manage" },
  { href: "/admin/feedback", label: "Feedback", permission: "feedback:view" },
  { href: "/admin/users", label: "Users", permission: "users:manage" },
  { href: "/admin/roles", label: "Roles & Permissions", permission: "roles:manage" },
  { href: "/admin/activity", label: "Activity Log", permission: "audit_log:view" },
] as const;

export function Sidebar({
  userName,
  permissions,
  isChapterAdmin,
}: {
  userName: string;
  permissions: Set<string>;
  isChapterAdmin: boolean;
}) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => {
    if (item.permission === null) return true;
    if (permissions.has(item.permission)) return true;
    // Chapter Admin holds no global permissions but does get scoped access
    // to Members (see requireChapterAccess) — show that one link for them.
    if (isChapterAdmin && item.permission === "members:manage") return true;
    return false;
  });

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col bg-navy-900 text-ivory-100">
      <div className="px-6 py-6">
        <p className="font-display text-base">Builders World Forum</p>
        <p className="mt-0.5 text-xs text-slate-400">Admin</p>
      </div>

      <nav className="flex-1 px-3">
        {items.map((item) => {
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
