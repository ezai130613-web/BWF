import { notFound } from "next/navigation";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { EditMeetingForm } from "@/components/admin/edit-meeting-form";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const meeting = await db.meeting.findUnique({ where: { id }, include: { chapter: true } });
  if (!meeting) notFound();

  await requireChapterAccess(meeting.chapterId, "meetings:manage");

  const visitors = await db.visitor.findMany({
    where: { meetingId: id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{meeting.chapter.name}</p>
      </div>

      <EditMeetingForm meeting={meeting} />

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Registered visitors ({visitors.length})</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visitors.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 text-neutral-900">{v.name}</td>
                <td className="px-4 py-3 text-neutral-600">{v.phone}</td>
                <td className="px-4 py-3 text-neutral-600">{v.category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{v.status.replace(/_/g, " ")}</td>
              </tr>
            ))}
            {visitors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No registrations yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
