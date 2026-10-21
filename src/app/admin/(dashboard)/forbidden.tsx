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
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">You don&rsquo;t have access to this.</h1>
      <p className="text-sm text-neutral-600">
        Your account doesn&rsquo;t have permission to view this page. If you think this is a mistake, contact a Super Admin.
      </p>
      <Link href="/admin" className="mt-2 text-sm font-medium text-neutral-900 underline">
        Back to dashboard
      </Link>
    </div>
  );
}
