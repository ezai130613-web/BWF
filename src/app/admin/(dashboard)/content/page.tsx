import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import { updateWebsiteContent } from "./actions";
import { AdminPageIcon } from "@/components/admin/page-icon";

/** Keys whose value is an image URL get the upload widget instead of a plain textarea. */
const IMAGE_KEYS = new Set(["payment.qrCodeUrl", "payment.membershipQrCodeUrl", "roster.visitorFeedbackQrUrl"]);

export default async function ContentPage() {
  await requirePermission("content:manage");

  const blocks = await db.websiteContent.findMany({ orderBy: [{ section: "asc" }, { label: "asc" }] });
  const bySection = new Map<string, typeof blocks>();
  for (const block of blocks) {
    if (!bySection.has(block.section)) bySection.set(block.section, []);
    bySection.get(block.section)!.push(block);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />Website Content</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Named copy blocks the public site reads at render time (brief §62) — not a full page
          builder. Leave a field blank to fall back to the site&rsquo;s default copy.
        </p>
      </div>

      {[...bySection.entries()].map(([section, items]) => (
        <div key={section} className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
          <h2 className="text-sm font-semibold text-neutral-900">{section}</h2>
          <div className="mt-4 flex flex-col gap-4">
            {items.map((item) =>
              IMAGE_KEYS.has(item.key) ? (
                <form key={item.key} action={updateWebsiteContent.bind(null, item.key)} className="flex flex-col gap-1.5">
                  <MediaUploadField label={item.label} name="value" kind="image" defaultValue={item.value} />
                  <button type="submit" className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                    Save
                  </button>
                </form>
              ) : (
                <form key={item.key} action={updateWebsiteContent.bind(null, item.key)} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700" htmlFor={item.key}>
                    {item.label}
                  </label>
                  <div className="flex gap-3">
                    <textarea
                      id={item.key}
                      name="value"
                      rows={2}
                      defaultValue={item.value ?? ""}
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                    />
                    <button type="submit" className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                      Save
                    </button>
                  </div>
                </form>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
