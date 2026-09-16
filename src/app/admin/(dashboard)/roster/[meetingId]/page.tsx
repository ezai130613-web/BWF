import Link from "next/link";
import { notFound } from "next/navigation";
import { getRosterWizardData } from "@/lib/roster/manage";
import { RosterWizard } from "@/components/admin/roster-wizard";

/**
 * Roster Sheet interactive management (2026-09-16 correction) — steps 3–7
 * of the workflow. Access control (requireChapterAccess) happens inside
 * getRosterWizardData() itself, same as this route's data needs it anyway.
 */
export default async function RosterMeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const data = await getRosterWizardData(meetingId);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/roster?chapterId=${data.chapterId}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to meetings
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">{data.chapterName} Roster</h1>
        <p className="mt-1 text-sm text-neutral-600">{data.meetingTitle}</p>
      </div>

      <RosterWizard data={data} />
    </div>
  );
}
