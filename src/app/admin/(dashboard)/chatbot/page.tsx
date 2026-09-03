import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { isChatbotConfigured } from "@/lib/chatbot/client";
import { ChatbotSettingsForm } from "@/components/admin/chatbot-settings-form";
import { setChatbotLeadStatus } from "./actions";

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

export default async function ChatbotPage() {
  await requirePermission("chatbot:manage");

  // Settings row always exists (seeded), but upsert defensively — same
  // pattern as the Weekly Reports admin page.
  const settings = await db.chatbotSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const leads = await db.chatbotLead.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Ask BWF</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Configure the public chatbot (brief §36-38) and follow up on leads it captures. This is
          one lead source, not BWF&rsquo;s general Leads system — see docs/ARCHITECTURE.md.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Settings</h2>
        <div className="mt-4">
          <ChatbotSettingsForm
            isEnabled={settings.isEnabled}
            accessMode={settings.accessMode}
            freeQuestionsLimit={settings.freeQuestionsLimit}
            isConfigured={isChatbotConfigured()}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Leads</h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Requirement</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-3 text-neutral-900">{lead.name}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {lead.phone}
                    {lead.email ? <span className="block text-xs text-neutral-400">{lead.email}</span> : null}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-neutral-600">{lead.requirement}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{lead.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {NEXT_STATUS[lead.status].map((next) => (
                        <form key={next.status} action={setChatbotLeadStatus.bind(null, lead.id, next.status)}>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No leads captured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
