import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Tags,
  Users,
  FileText,
  KeyRound,
  CalendarDays,
  ClipboardList,
  QrCode,
  ClipboardCheck,
  Send,
  UserPlus,
  ScanLine,
  UserCheck,
  Wallet,
  IndianRupee,
  Receipt,
  CreditCard,
  Trophy,
  Activity,
  CalendarRange,
  SquarePen,
  Clock,
  ScrollText,
  Library,
  History,
  Link2,
  Globe,
  Newspaper,
  Quote,
  Award,
  CircleHelp,
  MessageSquare,
  Mail,
  UserCog,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/**
 * Admin sidebar items, grouped like the member portal's nav (2026-10-21).
 * Shared by the sidebar and AdminPageIcon so a page's title badge always
 * matches its nav icon.
 *
 * Phase 20 Batch 4 — each item's `workspace` tag (Website Admin vs Member
 * Performance Admin, per the two-workspace split). Only applied to
 * Super/Central Admin — Chapter Admin's nav ignores this entirely (see the
 * filter in sidebar.tsx), since their access is scoped identically across
 * both workspaces already and splitting it would hide half of what they can do.
 * Phase 29 — an item may list several workspaces (the payment pages live
 * in both Member Performance Admin and the Accounts workspace).
 */
export type Workspace = "website" | "performance" | "marketing" | "accounts";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string | null;
  workspace: Workspace | Workspace[];
};

export const ADMIN_NAV_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: null, workspace: "website" },
      { href: "/admin/marketing", label: "Dashboard", icon: LayoutDashboard, permission: "marketing:manage", workspace: "marketing" },
    ],
  },
  {
    title: "Membership",
    items: [
      { href: "/admin/members", label: "Members", icon: Users, permission: "members:manage", workspace: "website" },
      { href: "/admin/applications", label: "Applications", icon: FileText, permission: "applications:manage", workspace: "website" },
      { href: "/admin/chapters", label: "Chapters", icon: Building2, permission: "chapters:manage", workspace: "website" },
      { href: "/admin/categories", label: "Categories", icon: Tags, permission: "categories:manage", workspace: "website" },
      { href: "/admin/companies", label: "Companies", icon: Briefcase, permission: "companies:manage", workspace: "website" },
      { href: "/admin/member-credentials", label: "Member Login Credentials", icon: KeyRound, permission: "users:manage", workspace: "website" },
    ],
  },
  {
    title: "Meetings & attendance",
    items: [
      { href: "/admin/meetings", label: "Meetings", icon: CalendarDays, permission: "meetings:manage", workspace: "website" },
      { href: "/admin/roster", label: "Roster Sheets", icon: ClipboardList, permission: "roster:manage", workspace: "performance" },
      { href: "/admin/qr-codes", label: "QR Codes", icon: QrCode, permission: "attendance:manage", workspace: "performance" },
      { href: "/admin/attendance", label: "Attendance", icon: ClipboardCheck, permission: "attendance:manage", workspace: "performance" },
      { href: "/admin/invitations", label: "Meeting Invitations", icon: Send, permission: "invitations:manage", workspace: "performance" },
    ],
  },
  {
    title: "Visitors",
    items: [
      { href: "/admin/visitors", label: "Visitors", icon: UserPlus, permission: "visitors:manage", workspace: "website" },
      { href: "/admin/visitors-qr", label: "Visitors QR", icon: ScanLine, permission: "attendance:manage", workspace: "performance" },
      { href: "/admin/visitors-attendance", label: "Visitors Attendance", icon: UserCheck, permission: "attendance:manage", workspace: "performance" },
    ],
  },
  {
    title: "Payments",
    items: [
      { href: "/admin/accounts", label: "All Payments", icon: Wallet, permission: "accounts:view", workspace: "accounts" },
      // Shown only to holders of payments:view (Accounts + Super Admin by default, 2026-10-03).
      { href: "/admin/payments", label: "Payments", icon: IndianRupee, permission: "payments:view", workspace: ["performance", "accounts"] },
      { href: "/admin/payments/members", label: "Member-wise Payments", icon: Receipt, permission: "accounts:view", workspace: "accounts" },
      { href: "/admin/payments/links", label: "Payment Links", icon: Link2, permission: "payments:view", workspace: ["performance", "accounts"] },
      { href: "/admin/visitors-payment", label: "Visitors Payment", icon: CreditCard, permission: "payments:view", workspace: ["performance", "accounts"] },
    ],
  },
  {
    title: "Member performance",
    items: [
      { href: "/admin/points-config", label: "App Points & Scoring", icon: Trophy, permission: "points_config:manage", workspace: "performance" },
      { href: "/admin/app-activity", label: "BWF App Activity", icon: Activity, permission: "app_activity:view", workspace: "performance" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/marketing/calendar", label: "Content Calendar", icon: CalendarRange, permission: "marketing:manage", workspace: "marketing" },
      { href: "/admin/marketing/create", label: "Content Creation", icon: SquarePen, permission: "marketing:manage", workspace: "marketing" },
      { href: "/admin/marketing/schedule", label: "Scheduling", icon: Clock, permission: "marketing:manage", workspace: "marketing" },
      { href: "/admin/marketing/scripts", label: "Script Writing", icon: ScrollText, permission: "marketing:manage", workspace: "marketing" },
      { href: "/admin/marketing/library", label: "Content Library", icon: Library, permission: "marketing:manage", workspace: "marketing" },
      { href: "/admin/marketing/history", label: "Publishing History", icon: History, permission: "marketing:manage", workspace: "marketing" },
      { href: "/admin/marketing/connected-accounts", label: "Connected Accounts", icon: Link2, permission: "marketing:manage", workspace: "marketing" },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/content", label: "Website Content", icon: Globe, permission: "content:manage", workspace: "website" },
      { href: "/admin/blogs", label: "Blog", icon: Newspaper, permission: "blogs:manage", workspace: "website" },
      { href: "/admin/testimonials", label: "Testimonials", icon: Quote, permission: "testimonials:manage", workspace: "website" },
      { href: "/admin/chief-guests", label: "Chief Guests", icon: Award, permission: "chief_guests:manage", workspace: "website" },
      { href: "/admin/faqs", label: "FAQs", icon: CircleHelp, permission: "content:manage", workspace: "website" },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, permission: "feedback:view", workspace: "website" },
      { href: "/admin/contact-requests", label: "Vendor Contact Requests", icon: Mail, permission: "contact_requests:view", workspace: "website" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: UserCog, permission: "users:manage", workspace: "website" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "roles:manage", workspace: "website" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "users:manage", workspace: "website" },
      { href: "/admin/activity", label: "Activity Log", icon: History, permission: "audit_log:view", workspace: "website" },
    ],
  },
];

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  website: "Website Admin",
  performance: "Member Performance Admin",
  marketing: "Marketing Admin",
  accounts: "Accounts",
};

const ALL_ITEMS = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

/**
 * The nav item a path belongs to — longest matching href wins, so
 * /admin/payments/members picks "Member-wise Payments", not "Payments",
 * and detail pages (/admin/members/abc) light up their list's item.
 */
export function activeNavHref(pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of ALL_ITEMS) {
    const matches = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}

export function navItemFor(pathname: string): AdminNavItem | null {
  const href = activeNavHref(pathname);
  return href ? (ALL_ITEMS.find((i) => i.href === href) ?? null) : null;
}
