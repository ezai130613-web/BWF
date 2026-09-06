import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { setLeadStatus } from "./actions";

const SOURCE_LABELS: Record<string, string> = {
  MEMBER_PROFILE_ENQUIRY: "Member profile enquiry",
  CONTACT_FORM: "Contact form",
  CHATBOT: "Ask BWF chatbot",
  MEMBERSHIP_ENQUIRY: "Membership enquiry",
  VISITOR_REGISTRATION: "Visitor registration",
  EVENT_REGISTRATION: "Event registration",
  CATEGORY_WAITLIST: "Category waiting list",
};

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-700",
  CONTACTED: "bg-sky-50 text-sky-700",
  CONVERTED: "bg-emerald-50 text-emerald-700",
  DISCARDED: "bg-neutral-100 text-neutral-500",
};

const NEXT_STATUS: Record<string, { label: string; status: "NEW" | "CONTACTED" | "CONVERTED" | "DISCARDED" }[]> = {
  NEW: [
    { label: "Mark contacted", status: "CONTACTED" },
    { label: "Discard", status: "DISCARDED" },
  ],
  CONTACTED: [
    { label: "Mark converted", status: "CONVERTED" },
    { label: "Discard", status: "DISCARDED" },
  ],
  CONVERTED: [{ label: "Reopen", status: "NEW" }],
  DISCARDED: [{ label: "Reopen", status: "NEW" }],
};

export default async function LeadsPage() {
  const scope = await getChapterScope("leads:manage");
  // A chapterless lead (chatbot, an unassigned waitlist enquiry) is only
  // ever visible to Central/Super Admin — see leads/actions.ts's
  // authorizeLeadAccess() for the matching write-side rule.
  const chapterFilter = scope === "ALL" ? {} : { chapterId: scope };

  const leads = await db.lead.findMany({
    where: chapterFilter,
    include: { chapter: true, category: true, member: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Leads</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Every lead-generating touchpoint on the site, in one place (brief §35) — membership
          enquiries, the waiting list, visitor/event registrations, and Ask BWF chatbot leads.
          Each still has its own detailed page (Applications, Visitors, Ask BWF); this is the
          shared rollup across all of them.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Chapter / Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-4 py-3 text-neutral-600">{SOURCE_LABELS[lead.source] ?? lead.source}</td>
                <td className="px-4 py-3 text-neutral-900">
                  {lead.name}
                  {lead.member ? <span className="block text-xs text-neutral-400">via {lead.member.name}</span> : null}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {lead.phone}
                  {lead.email ? <span className="block text-xs text-neutral-400">{lead.email}</span> : null}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {lead.chapter?.name ?? "—"}
                  {lead.category ? <span className="block text-xs text-neutral-400">{lead.category.name}</span> : null}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[lead.status]}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{lead.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {NEXT_STATUS[lead.status].map((next) => (
                      <form key={next.status} action={setLeadStatus.bind(null, lead.id, next.status)}>
                        <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                          {next.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No leads yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
