import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/marketing", label: "Dashboard" },
  { href: "/admin/marketing/library", label: "Content Library" },
  { href: "/admin/marketing/calendar", label: "Publishing Calendar" },
  { href: "/admin/marketing/history", label: "Publishing History" },
  { href: "/admin/marketing/connected-accounts", label: "Connected Accounts" },
] as const;

/** Marketing module's own sub-navigation — the sidebar only carries one "Marketing" entry for these 5 pages. */
export function MarketingNav({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-neutral-200 pb-3">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.href ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
