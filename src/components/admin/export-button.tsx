import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phase 36 — the "Download Excel" button on admin pages. Pass the page's
 * current filters as `params` so the file matches what's on screen; the
 * server re-applies the admin's own chapter scope regardless. A plain <a>,
 * not next/link — this is a file download, not a page navigation.
 */
export function ExportButton({
  dataset,
  params,
  label = "Download Excel",
  className,
}: {
  dataset: string;
  params?: Record<string, string | undefined | null>;
  label?: string;
  className?: string;
}) {
  const query = new URLSearchParams(
    Object.entries(params ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== ""),
  ).toString();
  return (
    <a
      href={`/api/admin/exports/${dataset}${query ? `?${query}` : ""}`}
      download
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:border-emerald-700 hover:text-emerald-800 print:hidden",
        className,
      )}
    >
      <Download className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );
}
