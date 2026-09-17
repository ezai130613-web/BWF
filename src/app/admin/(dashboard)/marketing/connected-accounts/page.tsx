import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { PLATFORM_LABELS } from "@/lib/marketing/constants";

const STATUS_LABEL: Record<string, string> = {
  NOT_CONNECTED: "Not connected",
  CONNECTED: "Connected",
  EXPIRED: "Connection expired",
  ERROR: "Connection error",
};

const STATUS_CLASS: Record<string, string> = {
  NOT_CONNECTED: "bg-neutral-100 text-neutral-600",
  CONNECTED: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  ERROR: "bg-red-50 text-red-700",
};

/**
 * Brief §11 — Connected Accounts. Batch 1 ships the real data model and this
 * read-only view; the actual OAuth "Connect" flow lands in Batch 2, once
 * BWF has registered a developer app with Meta/Google/Pinterest (see
 * docs/ARCHITECTURE.md's Marketing module notes for exactly what that
 * involves and why it can't be skipped — credentials are never pasted into
 * chat or committed to the repo, only entered through each platform's own
 * OAuth consent screen).
 */
export default async function MarketingConnectedAccountsPage() {
  await requirePermission("marketing:manage");

  const connections = await db.platformConnection.findMany({ orderBy: { platform: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Connected Accounts</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Manage which BWF social media accounts this system can publish to.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {connections.map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b border-neutral-100 p-4 last:border-b-0">
            <div>
              <p className="text-sm font-medium text-neutral-900">{PLATFORM_LABELS[c.platform]}</p>
              <p className="text-xs text-neutral-500">{c.accountName ?? "No account connected"}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
              <button
                type="button"
                disabled
                title="Available once BWF's developer app for this platform is registered"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-400"
              >
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
