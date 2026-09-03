import { NextResponse } from "next/server";
import { getChapterScope } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { EXPORT_CONTENT_TYPES, buildMemberExportRows, toCsv, toPdfBuffer, toXlsxBuffer, type ExportFormat } from "@/lib/reports/member-export";

/**
 * Brief §44/§45 — the Weekly Member Export, on demand. Re-checks chapter
 * access server-side rather than trusting the `chapterId` query param the
 * exports page last rendered — same discipline as registerVisitor/
 * submitApplication elsewhere in this app: a Chapter Admin cannot widen
 * their own export scope by editing the URL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const requestedChapterId = searchParams.get("chapterId");
  const includeExtra = searchParams.get("includeExtra") === "1";

  if (format !== "csv" && format !== "xlsx" && format !== "pdf") {
    return NextResponse.json({ error: "Invalid format." }, { status: 400 });
  }

  const scope = await getChapterScope("exports:manage");
  const chapterFilter = scope === "ALL" ? (requestedChapterId && requestedChapterId !== "all" ? { chapterId: requestedChapterId } : {}) : { chapterId: scope };

  const rows = await buildMemberExportRows(chapterFilter, includeExtra);

  await logActivity({
    action: "export.members",
    entity: "Member",
    metadata: { format, chapterId: chapterFilter.chapterId ?? "all", count: rows.length },
  });

  const title = chapterFilter.chapterId ? "BWF Members" : "BWF Members — All Chapters";
  const filenameBase = `bwf-members-${new Date().toISOString().slice(0, 10)}`;

  const rendered = await renderExport(format, rows, includeExtra, title);
  const body = typeof rendered === "string" ? rendered : new Uint8Array(rendered);

  return new NextResponse(body, {
    headers: {
      "Content-Type": EXPORT_CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filenameBase}.${format}"`,
    },
  });
}

async function renderExport(
  format: ExportFormat,
  rows: Awaited<ReturnType<typeof buildMemberExportRows>>,
  includeExtra: boolean,
  title: string,
): Promise<Buffer | string> {
  if (format === "csv") return toCsv(rows, includeExtra);
  if (format === "xlsx") return toXlsxBuffer(rows, includeExtra, title);
  return toPdfBuffer(rows, includeExtra, title);
}
