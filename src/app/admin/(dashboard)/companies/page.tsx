import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateCompanyForm } from "@/components/admin/create-company-form";

export default async function CompaniesPage() {
  await requirePermission("companies:manage");

  const companies = await db.company.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Companies</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          A company is not a member (brief §14) — one company can have several BWF
          representatives across different chapters. Create the company here first, then assign
          members to it from the Members page.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {companies.map((company) => (
              <tr key={company.id}>
                <td className="px-4 py-3 text-neutral-900">{company.name}</td>
                <td className="px-4 py-3 text-neutral-500">{company.website ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{company._count.members}</td>
              </tr>
            ))}
            {companies.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  No companies yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateCompanyForm />
    </div>
  );
}
