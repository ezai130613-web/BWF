import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateTestimonialForm } from "@/components/admin/create-testimonial-form";
import { setTestimonialStatus, toggleTestimonialFeatured } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

export default async function TestimonialsPage() {
  await requirePermission("testimonials:manage");

  const [testimonials, chapters] = await Promise.all([
    db.testimonial.findMany({ include: { chapter: true }, orderBy: { createdAt: "desc" } }),
    db.chapter.findMany({ orderBy: { name: "asc" } }),
  ]);

  const pending = testimonials.filter((t) => t.status === "PENDING");
  const rest = testimonials.filter((t) => t.status !== "PENDING");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Testimonials</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          Public submissions require approval (brief §33) — nothing appears on the site until
          approved here.
        </p>
      </div>

      {pending.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Pending review ({pending.length})</h2>
          <div className="mt-3 flex flex-col gap-3">
            {pending.map((t) => (
              <div key={t.id} className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <p className="text-sm text-neutral-900">
                  {t.name} {t.company ? `· ${t.company}` : ""} {t.chapter ? `· ${t.chapter.name}` : ""}
                </p>
                <p className="mt-2 text-sm text-neutral-700">&ldquo;{t.content}&rdquo;</p>
                <p className="mt-1 text-xs text-neutral-500">Consent given: {t.consent ? "Yes" : "No"}</p>
                <div className="mt-3 flex gap-4">
                  <form action={setTestimonialStatus.bind(null, t.id, "APPROVED")}>
                    <button type="submit" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
                      Approve
                    </button>
                  </form>
                  <form action={setTestimonialStatus.bind(null, t.id, "REJECTED")}>
                    <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Featured</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rest.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 text-neutral-900">{t.name}</td>
                <td className="px-4 py-3 text-neutral-600">{t.type}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-neutral-600">{t.featured ? "Yes" : "—"}</td>
                <td className="px-4 py-3 text-right">
                  {t.status === "APPROVED" ? (
                    <form action={toggleTestimonialFeatured.bind(null, t.id)}>
                      <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                        {t.featured ? "Unfeature" : "Feature"}
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {rest.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Nothing here yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateTestimonialForm chapters={chapters} />
    </div>
  );
}
