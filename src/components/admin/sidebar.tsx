"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ArrowLeftRight, KeyRound, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS, WORKSPACE_LABELS, activeNavHref, type AdminNavItem, type Workspace } from "./nav-config";

// Chapter Admin holds no global permissions but does get scoped access
// to Members/Meetings/Visitors within their own chapter (see
// requireChapterAccess) — show those links for them.
const CHAPTER_SCOPED_PERMISSIONS = [
  "members:manage",
  "meetings:manage",
  "visitors:manage",
  "app_activity:view",
  "roster:manage",
  "attendance:manage",
  "invitations:manage",
  "contact_requests:view",
];

type SidebarProps = {
  userName: string;
  permissions: Set<string>;
  isChapterAdmin: boolean;
  /** null for Chapter Admin (workspace-agnostic) or before a Super/Central Admin has picked one yet. */
  workspace: Workspace | null;
  /** false for an Accounts-only login — they have exactly one workspace. */
  canSwitchWorkspace: boolean;
};

function visibleGroups({ permissions, isChapterAdmin, workspace }: Pick<SidebarProps, "permissions" | "isChapterAdmin" | "workspace">) {
  const visible = (item: AdminNavItem) => {
    const allowed =
      item.permission === null ||
      permissions.has(item.permission) ||
      (isChapterAdmin && CHAPTER_SCOPED_PERMISSIONS.includes(item.permission));
    if (!allowed) return false;
    // Chapter Admin's nav is unaffected by the workspace split (see
    // nav-config.ts) — only Super/Central Admin get filtered to their
    // chosen workspace.
    if (isChapterAdmin || !workspace) return true;
    return Array.isArray(item.workspace) ? item.workspace.includes(workspace) : item.workspace === workspace;
  };
  return ADMIN_NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length > 0);
}

function NavLinks({ groups, pathname, onNavigate }: { groups: ReturnType<typeof visibleGroups>; pathname: string; onNavigate?: () => void }) {
  const activeHref = activeNavHref(pathname);
  return (
    <nav className="flex flex-col gap-6 px-3" aria-label="Admin">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600/90">{group.title}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = item.href === activeHref;
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

function Brand({ workspace }: { workspace: Workspace | null }) {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <Image src="/images/brand/bwf-logo-512.png" alt="" width={34} height={34} className="h-8.5 w-8.5" />
      <div className="leading-tight">
        <p className="font-display text-[15px] text-ivory-100">Builders World Forum</p>
        <p className="text-[11px] uppercase tracking-[0.15em] text-gold-400">{workspace ? WORKSPACE_LABELS[workspace] : "Admin"}</p>
      </div>
    </Link>
  );
}

function AccountBlock({ userName, isChapterAdmin, workspace, canSwitchWorkspace }: Omit<SidebarProps, "permissions">) {
  return (
    <div className="border-t border-emerald-800 px-5 py-4">
      <p className="truncate text-sm font-medium text-ivory-100">{userName}</p>
      <p className="truncate text-xs text-ivory-200/60">{isChapterAdmin ? "Chapter Admin" : workspace ? WORKSPACE_LABELS[workspace] : "Admin"}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {!isChapterAdmin && workspace && canSwitchWorkspace ? (
          <Link href="/admin/workspace" className="inline-flex items-center gap-2 text-xs font-medium text-ivory-200/80 hover:text-gold-300">
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden /> Switch workspace
          </Link>
        ) : null}
        <Link href="/admin/account" className="inline-flex items-center gap-2 text-xs font-medium text-ivory-200/80 hover:text-gold-300">
          <KeyRound className="h-3.5 w-3.5" aria-hidden /> Change password
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="inline-flex items-center gap-2 text-xs font-medium text-ivory-200/80 hover:text-gold-300"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = visibleGroups(props);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-emerald-900 to-emerald-950 lg:flex print:hidden!">
        <div className="px-6 py-6">
          <Brand workspace={props.workspace} />
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          <NavLinks groups={groups} pathname={pathname} />
        </div>
        <AccountBlock {...props} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-emerald-900 px-4 lg:hidden print:hidden">
        <Brand workspace={props.workspace} />
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
              <Brand workspace={props.workspace} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-ivory-100 hover:bg-emerald-800">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              <NavLinks groups={groups} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <AccountBlock {...props} />
          </div>
        </div>
      ) : null}
    </>
  );
}
