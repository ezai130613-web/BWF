import Link from "next/link";

/**
 * Renders when requirePermission()/requireChapterAccess()/etc. call
 * next/navigation's forbidden() (backlog #14) — e.g. a Chapter Admin
 * navigating directly to a URL outside their chapter, or any admin hitting
 * a page their role doesn't hold the permission for. Rendered inside this
 * route group's layout.tsx, so the sidebar/header stay visible and usable.
 */
export default function AdminForbidden() {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-neutral-200 bg-white p-8">
      <h1 className="text-lg font-semibold text-neutral-900">You don&rsquo;t have access to this.</h1>
      <p className="text-sm text-neutral-600">
        Your account doesn&rsquo;t have permission to view this page. If you think this is a mistake, contact a Super Admin.
      </p>
      <Link href="/admin" className="mt-2 text-sm font-medium text-neutral-900 underline">
        Back to dashboard
      </Link>
    </div>
  );
}
