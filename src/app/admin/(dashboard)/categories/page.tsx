import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateCategoryForm } from "@/components/admin/create-category-form";
import { toggleCategoryActive } from "./actions";

export default async function CategoriesPage() {
  await requirePermission("categories:manage");

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Categories</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          The business-category taxonomy used for the category-exclusivity rule (brief §15) —
          seeded with a starter list, edit freely. Deactivating a category hides it from new
          membership applications (Phase 7) without affecting existing members.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 text-neutral-900">{category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{category._count.members}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      category.isActive
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500"
                    }
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleCategoryActive.bind(null, category.id)}>
                    <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                      {category.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateCategoryForm />
    </div>
  );
}
