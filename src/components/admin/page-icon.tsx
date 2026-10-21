"use client";

import { usePathname } from "next/navigation";
import { navItemFor } from "./nav-config";

/**
 * Icon badge in front of an admin page's <h1>, matching the member portal's
 * PageHeader. Picks the icon of the sidebar item the current path belongs
 * to, so titles and nav always agree without each page naming an icon.
 */
export function AdminPageIcon() {
  const item = navItemFor(usePathname());
  if (!item) return null;
  return (
    <span className="mr-3 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-800 align-middle text-gold-300 shadow-sm print:hidden">
      <item.icon className="h-5 w-5" aria-hidden />
    </span>
  );
}
