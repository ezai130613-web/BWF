import Image from "next/image";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/rbac";
import { selectWorkspace } from "./actions";

/**
 * Phase 20 Batch 4 — "Select Admin Workspace." Only reachable meaningfully
 * by Super/Central Admin (proxy.ts only ever redirects them here); a
 * Chapter Admin landing on this URL directly gets bounced straight to
 * /admin instead of being shown a choice that doesn't apply to them (their
 * access is scoped identically across both workspaces already).
 */
export default async function WorkspaceSelectPage() {
  const session = await requireAdminSession();
  if (session.user.roles.includes("CHAPTER_ADMIN")) {
    redirect("/admin");
  }

  const selectWebsite = selectWorkspace.bind(null, "website");
  const selectPerformance = selectWorkspace.bind(null, "performance");
  const selectMarketing = selectWorkspace.bind(null, "marketing");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <Image src="/images/brand/bwf-logo-512.png" alt="Builders World Forum" width={48} height={48} className="h-12 w-12" priority />
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
          Builders World Forum
        </p>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">Select Admin Workspace</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-600">
          Choose which side of the admin you want to work in — you can switch anytime from the
          sidebar.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <form action={selectWebsite}>
            <button
              type="submit"
              className="w-full rounded-lg border border-neutral-200 bg-white p-6 text-left hover:border-neutral-900"
            >
              <p className="text-base font-semibold text-neutral-900">Website Admin</p>
              <p className="mt-1.5 text-sm text-neutral-600">
                Chapters, Members, Companies, Categories, Applications, Meetings, Visitors, Blog,
                Testimonials, Chief Guests, Website Content, Users &amp; Roles.
              </p>
            </button>
          </form>

          <form action={selectPerformance}>
            <button
              type="submit"
              className="w-full rounded-lg border border-neutral-200 bg-white p-6 text-left hover:border-neutral-900"
            >
              <p className="text-base font-semibold text-neutral-900">Member Performance Admin</p>
              <p className="mt-1.5 text-sm text-neutral-600">
                App Points &amp; Scoring, BWF App Activity (referrals, Thank You Slips, One-to-Ones,
                Power Dates, Conclaves), Roster Sheets, QR Codes, Attendance, Payments, Visitors QR,
                Visitors Attendance &amp; Visitors Payment.
              </p>
            </button>
          </form>

          <form action={selectMarketing}>
            <button
              type="submit"
              className="w-full rounded-lg border border-neutral-200 bg-white p-6 text-left hover:border-neutral-900"
            >
              <p className="text-base font-semibold text-neutral-900">Marketing Admin</p>
              <p className="mt-1.5 text-sm text-neutral-600">
                Content Calendar, Script Writing &amp; Content Creation, Scheduling &amp; Posting,
                Content Library, Publishing History &amp; Connected Accounts.
              </p>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
