import { notFound } from "next/navigation";
import Link from "next/link";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { VisitorStatusControl } from "@/components/admin/visitor-status-control";
import { VisitorNotesForm } from "@/components/admin/visitor-notes-form";

export default async function VisitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const visitor = await db.visitor.findUnique({
    where: { id },
    include: { category: true, chapter: true, meeting: true, event: true, referringMember: true },
  });
  if (!visitor) notFound();

  await requireChapterAccess(visitor.chapterId, "visitors:manage");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{visitor.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {visitor.category.name} · {visitor.chapter.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Visitor details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Phone</dt>
                <dd className="text-neutral-900">{visitor.phone}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="text-neutral-900">{visitor.email}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Company</dt>
                <dd className="text-neutral-900">{visitor.company ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Registered for</dt>
                <dd className="text-neutral-900">{visitor.meeting?.title ?? visitor.event?.title ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Referred by</dt>
                <dd className="text-neutral-900">
                  {visitor.referringMember ? (
                    <Link href={`/admin/members/${visitor.referringMember.id}`} className="underline">
                      {visitor.referringMember.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Registered on</dt>
                <dd className="text-neutral-900">{visitor.createdAt.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Notes</h2>
            <div className="mt-3">
              <VisitorNotesForm visitorId={visitor.id} notes={visitor.notes} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Status</h2>
            <div className="mt-3">
              <VisitorStatusControl visitorId={visitor.id} status={visitor.status} />
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Ready to apply?</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Visitor interest doesn&rsquo;t auto-create a membership application (brief §17) —
              have them submit one, or take their details down over a call.
            </p>
            <Link
              href="/apply"
              target="_blank"
              className="mt-3 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Open Apply page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
