import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ApplicationStatusControl } from "@/components/admin/application-status-control";
import { ApplicationNotesForm } from "@/components/admin/application-notes-form";
import { ReassignChapterForm } from "@/components/admin/reassign-chapter-form";
import { convertApplicationToMember } from "../actions";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("applications:manage");
  const { id } = await params;

  const application = await db.membershipApplication.findUnique({
    where: { id },
    include: { category: true, chapter: true, convertedMember: true },
  });
  if (!application) notFound();

  const chapters = await db.chapter.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{application.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {application.category.name} · {application.chapter?.name ?? "No chapter assigned (waiting list)"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Application details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Phone</dt>
                <dd className="text-neutral-900">{application.phone}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="text-neutral-900">{application.email}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Company</dt>
                <dd className="text-neutral-900">{application.companyName}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Designation</dt>
                <dd className="text-neutral-900">{application.designation ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Years in business</dt>
                <dd className="text-neutral-900">{application.yearsInBusiness ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Referral source</dt>
                <dd className="text-neutral-900">{application.referralSource ?? "—"}</dd>
              </div>
              {application.companyInfo ? (
                <div className="col-span-2">
                  <dt className="text-neutral-500">Company info</dt>
                  <dd className="text-neutral-900">{application.companyInfo}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Notes</h2>
            <div className="mt-3">
              <ApplicationNotesForm applicationId={application.id} notes={application.notes} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Status</h2>
            <div className="mt-3">
              <ApplicationStatusControl applicationId={application.id} status={application.status} />
            </div>
          </div>

          {!application.chapterId ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-neutral-900">Waiting list — assign a chapter</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Includes draft/internal chapters not yet public (brief §16).
              </p>
              <div className="mt-3">
                <ReassignChapterForm applicationId={application.id} chapters={chapters} />
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Convert to member</h2>
            {application.convertedMember ? (
              <p className="mt-3 text-sm text-emerald-700">
                Converted —{" "}
                <Link href={`/admin/members/${application.convertedMember.id}`} className="underline">
                  view member profile
                </Link>
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-neutral-500">
                  Only do this once payment is confirmed (brief §17 step 7) — this creates the
                  real, public member profile.
                </p>
                <form action={convertApplicationToMember.bind(null, application.id)} className="mt-3">
                  <button
                    type="submit"
                    disabled={!application.chapterId}
                    className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Create member account
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
