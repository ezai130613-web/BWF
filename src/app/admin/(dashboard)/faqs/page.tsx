import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateFaqForm } from "@/components/admin/create-faq-form";
import { toggleFaqActive } from "./actions";

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
          <div key={faq.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">{faq.question}</p>
                <p className="mt-1 text-sm text-neutral-600">{faq.answer}</p>
              </div>
              <form action={toggleFaqActive.bind(null, faq.id)}>
                <button type="submit" className="whitespace-nowrap text-sm text-neutral-500 hover:text-neutral-900">
                  {faq.isActive ? "Hide" : "Show"}
                </button>
              </form>
            </div>
          </div>
        ))}
        {faqs.length === 0 ? <p className="text-sm text-neutral-400">No FAQs yet.</p> : null}
      </div>

      <CreateFaqForm />
    </div>
  );
}
