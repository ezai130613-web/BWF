import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateBlogCategoryForm } from "@/components/admin/create-blog-category-form";

export default async function BlogCategoriesPage() {
  await requirePermission("blogs:manage");

  const categories = await db.blogCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Blog Categories</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          Seeded with the brief&rsquo;s suggested starter list (§30) — edit freely.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Posts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 text-neutral-900">{category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{category._count.posts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateBlogCategoryForm />
    </div>
  );
}
