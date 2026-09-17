"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/rbac";

export type AdminWorkspace = "website" | "performance" | "marketing";

const WORKSPACE_HOME: Record<AdminWorkspace, string> = {
  website: "/admin",
  // "Member Performance Admin panel refinement" is its own separate,
  // not-yet-started backlog item — this deliberately reuses the existing
  // BWF App Activity page as Performance's landing spot rather than
  // building a new dashboard here.
  performance: "/admin/app-activity",
  // Marketing portal (2026-09-18) — has its own real Dashboard page, unlike
  // Performance above.
  marketing: "/admin/marketing",
};

/**
 * Phase 20 Batch 4 — a per-browser UI preference, not account data, so a
 * plain cookie rather than a new User column. Remembered ~30 days so this
 * is a one-time choice per browser, not a nag every login; "Switch
 * workspace" in the sidebar re-visits this page to change it.
 */
export async function selectWorkspace(workspace: AdminWorkspace) {
  await requireAdminSession();

  // No `secure` flag — unlike the session cookie, this carries no sensitive
  // value (just a UI preference), so there's nothing to protect by
  // requiring HTTPS, and setting it would silently fail to store on any
  // plain-HTTP deployment/local run.
  const cookieStore = await cookies();
  cookieStore.set("bwf_admin_workspace", workspace, {
    httpOnly: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(WORKSPACE_HOME[workspace]);
}
