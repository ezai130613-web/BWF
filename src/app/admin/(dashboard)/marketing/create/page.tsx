import { requirePermission } from "@/lib/auth/rbac";
import { CreateMarketingContentForm } from "@/components/admin/create-marketing-content-form";

export default async function MarketingCreatePage() {
  await requirePermission("marketing:manage");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Script Writing & Content Creation</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Upload the video and write its caption or script once — reuse and fine-tune it for each platform when you schedule it.
        </p>
      </div>

      <CreateMarketingContentForm />
    </div>
  );
}
