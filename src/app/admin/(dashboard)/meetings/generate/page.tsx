import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { nextMonthOf, planMonthMeetings } from "@/lib/meetings/generate";
import { formatIst } from "@/lib/ist";
import { GenerateMeetingsConfirm } from "@/components/admin/generate-meetings-confirm";

export default async function GenerateMeetingsPage() {
  const scope = await getChapterScope("meetings:manage");
  const target = nextMonthOf(new Date());
  const plan = await planMonthMeetings(target, scope);
  const toCreate = plan.meetings.filter((m) => !m.existingMeetingId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/meetings" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Meetings
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">Create {plan.label} Meetings</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Built from each active chapter&rsquo;s recurring schedule (set on the chapter&rsquo;s edit page). Public
          holidays are not skipped. Chief Guest stays <strong>Not Assigned</strong>, the member reminder is
          <strong> ON</strong>, and the venue defaults to the chapter&rsquo;s venue — every field can be changed per
          meeting afterwards. Dates that already have a meeting for that chapter are skipped, never duplicated.
        </p>
      </div>

      {plan.unconfigured.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">These chapters will be skipped until their schedule is complete:</p>
          <ul className="mt-2 list-disc pl-5">
            {plan.unconfigured.map((c) => (
              <li key={c.chapterId}>
                <Link href={`/admin/chapters/${c.chapterId}`} className="underline">
                  {c.chapterName}
                </Link>{" "}
                — missing {c.missing.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Venue</th>
              <th className="px-4 py-3 font-medium">Chief Guest</th>
              <th className="px-4 py-3 font-medium">Will</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {plan.meetings.map((m) => (
              <tr key={`${m.chapterId}-${m.startsAt.toISOString()}`} className={m.existingMeetingId ? "bg-neutral-50 text-neutral-400" : ""}>
                <td className="px-4 py-3 text-neutral-900">{m.chapterName}</td>
                <td className="px-4 py-3">{formatIst(m.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-3">{formatIst(m.startsAt, { hour: "numeric", minute: "2-digit" })}</td>
                <td className="px-4 py-3">{m.title}</td>
                <td className="px-4 py-3">{m.venue}</td>
                <td className="px-4 py-3 text-neutral-500">Not Assigned</td>
                <td className="px-4 py-3">
                  {m.existingMeetingId ? (
                    <Link href={`/admin/meetings/${m.existingMeetingId}`} className="text-xs underline">
                      Skip — already exists
                    </Link>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Create</span>
                  )}
                </td>
              </tr>
            ))}
            {plan.meetings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No meetings to plan — check that chapters are Active and have a recurring schedule.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <GenerateMeetingsConfirm target={target} createCount={toCreate.length} label={plan.label} />
    </div>
  );
}
