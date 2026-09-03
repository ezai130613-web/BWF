import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

export default async function ExportsPage() {
  const scope = await getChapterScope("exports:manage");

  const chapters = scope === "ALL" ? await db.chapter.findMany({ orderBy: { name: "asc" } }) : [];
  const ownChapter = scope !== "ALL" ? await db.chapter.findUniqueOrThrow({ where: { id: scope } }) : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Exports</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Weekly Member Export (brief §44) — Member Name, Category, Phone Number, and Membership
          Status, in Excel, CSV, or PDF. {scope === "ALL"
            ? "Export one chapter, or produce a master export covering all chapters (brief §45)."
            : `Scoped to ${ownChapter?.name} only — Chapter Admin access covers this chapter (brief §45).`}
        </p>
      </div>

      <form action="/api/admin/exports/members" method="GET" className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-6">
        {scope === "ALL" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapterId" className="text-sm font-medium text-neutral-700">
              Chapter
            </label>
            <select
              id="chapterId"
              name="chapterId"
              defaultValue="all"
              className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              <option value="all">All chapters (master export)</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="chapterId" value={scope} />
        )}

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="includeExtra" value="1" className="h-4 w-4 rounded border-neutral-300" />
          Include chapter &amp; company columns (in addition to the four required fields)
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="format"
            value="csv"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Download CSV
          </button>
          <button
            type="submit"
            name="format"
            value="xlsx"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Download Excel
          </button>
          <button
            type="submit"
            name="format"
            value="pdf"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Download PDF
          </button>
        </div>
      </form>
    </div>
  );
}
