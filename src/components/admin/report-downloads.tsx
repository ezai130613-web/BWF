import { FileText } from "lucide-react";
import { ExportButton } from "@/components/admin/export-button";

/** Excel + PDF download buttons for an Accounts report; `params` are the page's current filters. */
export function ReportDownloads({ report, params }: { report: string; params: Record<string, string | undefined | null> }) {
  const query = new URLSearchParams({
    report,
    ...Object.fromEntries(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "")),
  }).toString();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ExportButton dataset={report} params={params} label="Download Excel" />
      <a
        href={`/api/admin/exports/pdf?${query}`}
        download
        className="inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:border-emerald-700 hover:text-emerald-800 print:hidden"
      >
        <FileText className="h-4 w-4" aria-hidden />
        Download PDF
      </a>
    </div>
  );
}
