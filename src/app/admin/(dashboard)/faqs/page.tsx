import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateFaqForm } from "@/components/admin/create-faq-form";
import { EditFaqForm } from "@/components/admin/edit-faq-form";

export default async function FaqsPage() {
  await requirePermission("content:manage");

  const faqs = await db.siteFaq.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">FAQs</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">Shown on the public /faqs page.</p>
      </div>

      <div className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <EditFaqForm key={faq.id} faq={faq} />
        ))}
        {faqs.length === 0 ? <p className="text-sm text-neutral-400">No FAQs yet.</p> : null}
      </div>

      <CreateFaqForm />
    </div>
  );
}
