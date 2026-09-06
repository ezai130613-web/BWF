import { requirePermission } from "@/lib/auth/rbac";
import { getAdminAnalytics } from "@/lib/dashboard/admin-analytics";

const SOURCE_LABELS: Record<string, string> = {
  MEMBER_PROFILE_ENQUIRY: "Member profile enquiry",
  CONTACT_FORM: "Contact form",
  CHATBOT: "Ask BWF chatbot",
  MEMBERSHIP_ENQUIRY: "Membership enquiry",
  VISITOR_REGISTRATION: "Visitor registration",
  EVENT_REGISTRATION: "Event registration",
  CATEGORY_WAITLIST: "Category waiting list",
};

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

function BreakdownCard({
  title,
  total,
  rows,
  labels,
}: {
  title: string;
  total: number;
  rows: { status: string; count: number }[];
  labels?: Record<string, string>;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        <span className="text-sm text-neutral-500">{total} total</span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {rows
          .slice()
          .sort((a, b) => b.count - a.count)
          .map((row) => (
            <div key={row.status} className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">{labels?.[row.status] ?? row.status.replace(/_/g, " ")}</span>
              <span className="font-medium text-neutral-900">{row.count}</span>
            </div>
          ))}
        {rows.length === 0 ? <p className="text-sm text-neutral-400">No data yet.</p> : null}
      </div>
    </div>
  );
}

function formatPercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`;
}

export default async function AdminAnalyticsPage() {
  await requirePermission("analytics:view");
  const analytics = await getAdminAnalytics();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Admin Analytics</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Simplified analytics across the enquiry → application → member funnel (brief §51). Only
          covers what&rsquo;s honestly derivable from this app&rsquo;s own data — real website
          traffic, most-viewed profiles/chapters, and top blogs need a live GA4 property (see
          below), not a fabricated substitute.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile label="Total enquiries" value={analytics.enquiries.total} hint="All Lead sources — brief §35" />
        <Tile label="Membership applications" value={analytics.applications.total} />
        <Tile label="Visitor registrations" value={analytics.visitors.total} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Conversion metrics</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Tile
            label="Visitor → converted"
            value={formatPercent(analytics.conversions.visitorToConverted)}
            hint="Visitors marked CONVERTED"
          />
          <Tile
            label="Application → paid"
            value={formatPercent(analytics.conversions.applicationToPaid)}
            hint="Applications that became a paid member"
          />
          <Tile
            label="Enquiry → converted"
            value={formatPercent(analytics.conversions.leadToConverted)}
            hint="Leads marked CONVERTED, any source"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="Enquiries by source"
          total={analytics.enquiries.total}
          rows={analytics.enquiries.bySource.map((r) => ({ status: r.source, count: r.count }))}
          labels={SOURCE_LABELS}
        />
        <BreakdownCard title="Enquiries by status" total={analytics.enquiries.total} rows={analytics.enquiries.byStatus} />
        <BreakdownCard title="Applications by status" total={analytics.applications.total} rows={analytics.applications.byStatus} />
        <BreakdownCard title="Visitors by status" total={analytics.visitors.total} rows={analytics.visitors.byStatus} />
      </div>

      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Needs a real GA4 property (backlog #19)</h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Brief §51 also asks for website visitors, most-viewed member profiles, most-searched
          categories, most-viewed chapters, and top blogs — all real-traffic metrics this app
          doesn&rsquo;t track itself (that&rsquo;s GA4&rsquo;s job, brief §50). Once a real GA4
          property exists, these belong here too, pulled via the GA4 Data API rather than
          estimated from anything in this database.
        </p>
      </div>
    </div>
  );
}
