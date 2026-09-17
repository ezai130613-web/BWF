"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Phase 20 Batch 4 — each item's `workspace` tag (Website Admin vs Member
// Performance Admin, per the two-workspace split). Only applied to
// Super/Central Admin — Chapter Admin's nav ignores this entirely (see the
// filter below), since their access is scoped identically across both
// workspaces already and splitting it would hide half of what they can do.
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", permission: null, workspace: "website" },
  { href: "/admin/chapters", label: "Chapters", permission: "chapters:manage", workspace: "website" },
  { href: "/admin/companies", label: "Companies", permission: "companies:manage", workspace: "website" },
  { href: "/admin/categories", label: "Categories", permission: "categories:manage", workspace: "website" },
  { href: "/admin/members", label: "Members", permission: "members:manage", workspace: "website" },
  { href: "/admin/applications", label: "Applications", permission: "applications:manage", workspace: "website" },
  { href: "/admin/meetings", label: "Meetings", permission: "meetings:manage", workspace: "website" },
  { href: "/admin/visitors", label: "Visitors", permission: "visitors:manage", workspace: "website" },
  { href: "/admin/roster", label: "Roster Sheets", permission: "roster:manage", workspace: "performance" },
  { href: "/admin/qr-codes", label: "QR Codes", permission: "attendance:manage", workspace: "performance" },
  { href: "/admin/attendance", label: "Attendance", permission: "attendance:manage", workspace: "performance" },
  { href: "/admin/payments", label: "Payments", permission: "payments:view", workspace: "performance" },
  { href: "/admin/visitors-qr", label: "Visitors QR", permission: "attendance:manage", workspace: "performance" },
  { href: "/admin/visitors-attendance", label: "Visitors Attendance", permission: "attendance:manage", workspace: "performance" },
  { href: "/admin/visitors-payment", label: "Visitors Payment", permission: "payments:view", workspace: "performance" },
  { href: "/admin/invitations", label: "Meeting Invitations", permission: "invitations:manage", workspace: "performance" },
  { href: "/admin/blogs", label: "Blog", permission: "blogs:manage", workspace: "website" },
  { href: "/admin/marketing", label: "Marketing", permission: "marketing:manage", workspace: "website" },
  { href: "/admin/testimonials", label: "Testimonials", permission: "testimonials:manage", workspace: "website" },
  { href: "/admin/chief-guests", label: "Chief Guests", permission: "chief_guests:manage", workspace: "website" },
  { href: "/admin/points-config", label: "App Points & Scoring", permission: "points_config:manage", workspace: "performance" },
  { href: "/admin/app-activity", label: "BWF App Activity", permission: "app_activity:view", workspace: "performance" },
  { href: "/admin/content", label: "Website Content", permission: "content:manage", workspace: "website" },
  { href: "/admin/faqs", label: "FAQs", permission: "content:manage", workspace: "website" },
  { href: "/admin/feedback", label: "Feedback", permission: "feedback:view", workspace: "website" },
  { href: "/admin/users", label: "Users", permission: "users:manage", workspace: "website" },
  { href: "/admin/roles", label: "Roles & Permissions", permission: "roles:manage", workspace: "website" },
  { href: "/admin/activity", label: "Activity Log", permission: "audit_log:view", workspace: "website" },
] as const;

export function Sidebar({
  userName,
  permissions,
  isChapterAdmin,
  workspace,
}: {
  userName: string;
  permissions: Set<string>;
  isChapterAdmin: boolean;
  /** null for Chapter Admin (workspace-agnostic) or before a Super/Central Admin has picked one yet. */
  workspace: "website" | "performance" | null;
}) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => {
    if (item.permission === null) return true;
    if (permissions.has(item.permission)) return true;
    // Chapter Admin holds no global permissions but does get scoped access
    // to Members/Meetings/Visitors within their own chapter (see
    // requireChapterAccess) — show those links for them.
    const chapterScopedPermissions = [
      "members:manage",
      "meetings:manage",
      "visitors:manage",
      "app_activity:view",
      "roster:manage",
      "attendance:manage",
      "payments:view",
      "invitations:manage",
    ];
    if (isChapterAdmin && chapterScopedPermissions.includes(item.permission)) return true;
    return false;
  }).filter((item) => {
    // Chapter Admin's nav is unaffected by the workspace split (see the
    // NAV_ITEMS comment above) — only Super/Central Admin get filtered to
    // their chosen workspace.
    if (isChapterAdmin || !workspace) return true;
    return item.workspace === workspace;
  });

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col bg-emerald-900 text-ivory-100">
      <div className="flex items-center gap-3 px-6 py-6">
        <Image src="/images/brand/bwf-logo-512.png" alt="" width={32} height={32} className="h-8 w-8 flex-shrink-0" />
        <div>
          <p className="font-display text-base">Builders World Forum</p>
          <p className="mt-0.5 text-xs text-slate-400">Admin</p>
        </div>
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
                active ? "bg-emerald-700 text-gold-300" : "text-slate-400 hover:bg-emerald-800 hover:text-ivory-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-emerald-700 px-6 py-4">
        <p className="truncate text-sm text-ivory-200">{userName}</p>
        {!isChapterAdmin && workspace ? (
          <p className="mt-1 text-xs text-slate-400">
            {workspace === "website" ? "Website Admin" : "Member Performance Admin"} ·{" "}
            <Link href="/admin/workspace" className="underline hover:text-ivory-100">
              Switch workspace
            </Link>
          </p>
        ) : null}
      </div>
    </aside>
  );
}
