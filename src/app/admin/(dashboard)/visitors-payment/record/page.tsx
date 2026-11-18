import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { RecordVisitorPaymentForm } from "@/components/admin/record-visitor-payment-form";

/** Record a visitor's cash / transfer / UPI / cheque payment by hand — like Record Offline Payment, for visitors. */
export default async function RecordVisitorPaymentPage() {
  await requirePermission("payments:approve");
  const now = new Date().getTime();
  const meetings = await db.meeting.findMany({
    where: { status: { not: "CANCELLED" }, startsAt: { gte: new Date(now - 60 * 86_400_000), lte: new Date(now + 7 * 86_400_000) } },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      chapter: { select: { name: true } },
      visitorAttendances: {
        where: { payment: null },
        select: { id: true, visitorProfile: { select: { name: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />
          Record Visitor Payment
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          For visitors who paid by cash, bank transfer, UPI or cheque. Pick the meeting, then the visitor. It is approved straight away.
        </p>
      </div>
      <RecordVisitorPaymentForm
        meetings={meetings.map((m) => ({
          id: m.id,
          label: `${m.chapter.name} — ${m.startsAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })} — ${m.title}`,
          visitors: m.visitorAttendances.map((a) => ({ id: a.id, label: `${a.visitorProfile.name} · ${a.visitorProfile.phone}` })),
        }))}
      />
    </div>
  );
}
