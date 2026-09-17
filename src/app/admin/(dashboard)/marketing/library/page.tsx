import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

export default async function MarketingLibraryPage() {
  await requirePermission("marketing:manage");

  const content = await db.marketingContent.findMany({
    include: { scheduledPosts: { select: { platform: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Content Library</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Every video uploaded once here can be scheduled to any combination of platforms — reused, not re-uploaded.
          </p>
        </div>
        <Link
          href="/admin/marketing/create"
          className="flex-shrink-0 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Create new
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Content</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
              <th className="px-4 py-3 font-medium">Scheduled to</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {content.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- R2 URL, not a next/image-managed asset
                      <img src={item.thumbnailUrl} alt="" className="h-12 w-12 rounded-md border border-neutral-200 object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-[10px] text-neutral-400">
                        Video
                      </div>
                    )}
                    <span className="font-medium text-neutral-900">{item.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{item.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {item.scheduledPosts.length === 0 ? (
                    <span className="text-neutral-400">Not scheduled yet</span>
                  ) : (
                    <span>
                      {item.scheduledPosts.length} platform{item.scheduledPosts.length === 1 ? "" : "s"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/marketing/library/${item.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
            {content.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No content uploaded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
