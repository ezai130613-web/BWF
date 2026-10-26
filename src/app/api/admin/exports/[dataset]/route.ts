import { forbidden, notFound } from "next/navigation";
import { logActivity } from "@/lib/audit";
import { getExportAccess } from "@/lib/exports/access";
import { EXPORT_DATASETS, findExportDataset } from "@/lib/exports/datasets";
import { exportFilename, xlsxResponse, type ExportSheet } from "@/lib/exports/workbook";

/**
 * Phase 36 — every admin page's "Download Excel" button lands here
 * (/api/admin/exports/<dataset>?<the page's filters>), plus `all`: one
 * workbook holding every dataset this admin may see, each scoped exactly as
 * its own page is. Static siblings (admin-users, the PDF) take precedence.
 *
 * Each download is audit-logged — these files carry member contact details
 * and payment proofs.
 */
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset: key } = await params;
  const access = await getExportAccess();
  const searchParams = new URL(request.url).searchParams;

  let sheets: ExportSheet[];
  let fileName: string;

  if (key === "all") {
    const allowed = EXPORT_DATASETS.flatMap((d) => {
      const scope = d.skipInAll ? null : d.scope(access);
      return scope ? [{ dataset: d, scope }] : [];
    });
    if (allowed.length === 0) forbidden();
    // One at a time — each loader already runs its own queries in parallel,
    // and ~20 at once would crowd the database connection pool.
    sheets = [];
    for (const { dataset, scope } of allowed) {
      sheets.push(...(await dataset.load(scope, new URLSearchParams())));
    }
    fileName = exportFilename("all-data");
  } else {
    const dataset = findExportDataset(key);
    if (!dataset) notFound();
    const scope = dataset.scope(access);
    if (!scope) forbidden();
    sheets = await dataset.load(scope, searchParams);
    fileName = exportFilename(dataset.key);
  }

  await logActivity({
    userId: access.userId,
    action: "export.downloaded",
    entity: "Export",
    entityId: key,
    metadata: {
      filters: Object.fromEntries(searchParams),
      sheets: sheets.map((s) => ({ name: s.name, rows: s.rows.length })),
    },
  });

  return xlsxResponse(sheets, fileName);
}
