import Link from "next/link";

/**
 * Plain-link pagination (no client JS) — same "works without JS, shareable
 * links" principle the member directory's filters already follow (brief
 * §18). `buildHref` lets the caller fold the page number back into whatever
 * other query params (search/filter) are already on the URL.
 */
export function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-3">
      <PaginationLink page={currentPage - 1} buildHref={buildHref} disabled={currentPage <= 1}>
        ← Previous
      </PaginationLink>
      <span className="text-sm text-slate-400">
        Page {currentPage} of {totalPages}
      </span>
      <PaginationLink page={currentPage + 1} buildHref={buildHref} disabled={currentPage >= totalPages}>
        Next →
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  page,
  buildHref,
  disabled,
  children,
}: {
  page: number;
  buildHref: (page: number) => string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-md border border-emerald-700 px-4 py-2 text-sm text-slate-600">{children}</span>;
  }
  return (
    <Link
      href={buildHref(page)}
      className="rounded-md border border-emerald-600 px-4 py-2 text-sm text-ivory-100 transition-colors hover:border-gold-500/50"
    >
      {children}
    </Link>
  );
}
