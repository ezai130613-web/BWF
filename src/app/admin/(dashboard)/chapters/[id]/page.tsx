import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { EditChapterForm } from "@/components/admin/edit-chapter-form";
import { AssignLeadershipForm } from "@/components/admin/assign-leadership-form";
import { AssignRosterRoleForm } from "@/components/admin/assign-roster-role-form";
import { CreateRosterRoleForm } from "@/components/admin/create-roster-role-form";
import { removeChapterLeadership, removeRosterAssignment } from "../actions";

// Founder/Co-Founder are BWF's own founding roles — fixed for every chapter,
// not reassignable or removable via this page (client correction, 2026-09-15).
// Same "match on ChapterLeadershipRole.key" precedent as the Roster Sheet PDF
// generator's own Founder/Co-Founder band (src/lib/roster/generate.ts).
const FOUNDING_ROLE_ORDER = ["FOUNDER", "CO_FOUNDER"] as const;

// Roster Sheet PDF correction (2026-09-15) — which of the three Coordinators
// columns (President/Secretary/Treasurer Associates) an assignment renders
// under. See RosterAssignment.group's schema comment for why this can't be
// derived from the role itself.
const ROSTER_GROUP_LABELS: Record<string, string> = {
  PRESIDENT: "President Associates",
  SECRETARY: "Secretary Associates",
  TREASURER: "Treasurer Associates",
};

export default async function ChapterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("chapters:manage");
  const { id } = await params;

  const chapter = await db.chapter.findUnique({
    where: { id },
    include: {
      members: { orderBy: { name: "asc" } },
      leadership: { include: { member: true, role: true }, orderBy: { startedAt: "asc" } },
      rosterAssignments: { include: { member: true, role: true }, orderBy: [{ role: { order: "asc" } }, { createdAt: "asc" }] },
    },
  });
  if (!chapter) notFound();

  const leadershipRoles = await db.chapterLeadershipRole.findMany({ orderBy: { label: "asc" } });
  const rosterRoles = await db.rosterRole.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  const foundingLeadership = FOUNDING_ROLE_ORDER.map((key) =>
    chapter.leadership.find((entry) => entry.role.key === key),
  ).filter((entry): entry is (typeof chapter.leadership)[number] => Boolean(entry));
  const editableLeadership = chapter.leadership.filter(
    (entry) => !(FOUNDING_ROLE_ORDER as readonly string[]).includes(entry.role.key),
  );
  const editableLeadershipRoles = leadershipRoles.filter(
    (role) => !(FOUNDING_ROLE_ORDER as readonly string[]).includes(role.key),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{chapter.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">/chapters/{chapter.slug}</p>
      </div>

      <EditChapterForm chapter={chapter} />

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Founding Members</h2>
        <p className="mt-1 text-sm text-neutral-600">
          BWF&rsquo;s Founder and Co-Founder, shown first on every chapter. Fixed — not editable,
          reassignable, or removable from this page.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {foundingLeadership.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-neutral-900">{entry.role.label}</td>
                  <td className="px-4 py-3 text-neutral-600">{entry.member.name}</td>
                </tr>
              ))}
              {foundingLeadership.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-neutral-400">
                    Founder/Co-Founder not assigned yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Leadership</h2>
        <p className="mt-1 text-sm text-neutral-600">Assign members to a leadership role for this chapter.</p>

        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {editableLeadership.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-neutral-900">{entry.role.label}</td>
                  <td className="px-4 py-3 text-neutral-600">{entry.member.name}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={removeChapterLeadership.bind(null, chapter.id, entry.id)}>
                      <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {editableLeadership.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-neutral-400">
                    No leadership assigned yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6">
          {chapter.members.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Add members to this chapter first before assigning leadership.
            </p>
          ) : (
            <AssignLeadershipForm chapterId={chapter.id} members={chapter.members} roles={editableLeadershipRoles} />
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Coordinators</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Week-to-week duty assignments (Power Date Coordinator, Visitor Coordinator, etc.) shown
          on this chapter&rsquo;s generated Roster Sheet — separate from Leadership above. Assign
          members to a role below, and reassign whenever a duty rotates — every roster generated
          afterward reflects the latest assignment.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Column</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {chapter.rosterAssignments.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-neutral-600">{ROSTER_GROUP_LABELS[entry.group]}</td>
                  <td className="px-4 py-3 text-neutral-900">{entry.role.label}</td>
                  <td className="px-4 py-3 text-neutral-600">{entry.member.name}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={removeRosterAssignment.bind(null, chapter.id, entry.id)}>
                      <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {chapter.rosterAssignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                    No coordinators assigned yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6">
          {chapter.members.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Add members to this chapter first before assigning coordinators.
            </p>
          ) : (
            <AssignRosterRoleForm chapterId={chapter.id} members={chapter.members} roles={rosterRoles} />
          )}
        </div>

        <details className="mt-4 rounded-lg border border-neutral-200 bg-white">
          <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-neutral-900">
            Manage coordinator role types
          </summary>
          <div className="flex flex-col gap-4 border-t border-neutral-200 px-6 py-4">
            <p className="text-sm text-neutral-600">
              This role catalog is shared across every chapter — adding one here makes it
              available on every chapter&rsquo;s Coordinators form immediately, no code change
              needed.
            </p>
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Assignments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rosterRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-4 py-3 text-neutral-900">{role.label}</td>
                      <td className="px-4 py-3 text-neutral-600">{role._count.assignments}</td>
                    </tr>
                  ))}
                  {rosterRoles.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-neutral-400">
                        No coordinator roles yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <CreateRosterRoleForm />
          </div>
        </details>
      </div>
    </div>
  );
}
