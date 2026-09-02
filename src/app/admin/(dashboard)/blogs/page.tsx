import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateBlogForm } from "@/components/admin/create-blog-form";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-500",
  SCHEDULED: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  UNPUBLISHED: "bg-neutral-100 text-neutral-500",
  ARCHIVED: "bg-red-50 text-red-700",
};

export default async function BlogsPage() {
  await requirePermission("blogs:manage");

  const [posts, categories, authors] = await Promise.all([
    db.blog.findMany({
      include: { category: true, author: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.blogCategory.findMany({ orderBy: { name: "asc" } }),
    db.author.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Blog</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Start a draft here, then fill in content/SEO/FAQ on the post&rsquo;s own page.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Author</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-4 py-3 text-neutral-900">{post.title || "Untitled"}</td>
                <td className="px-4 py-3 text-neutral-600">{post.category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{post.author.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[post.status]}`}>
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/blogs/${post.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No posts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateBlogForm categories={categories} authors={authors} />
    </div>
  );
}
