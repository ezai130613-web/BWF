import type { MeetingReminderStatus, MeetingStatus } from "@/generated/prisma/client";

const STATUS: Record<MeetingReminderStatus, { label: string; className: string }> = {
  SENDING: { label: "Sending…", className: "bg-sky-50 text-sky-700" },
  SENT: { label: "Sent", className: "bg-emerald-50 text-emerald-700" },
  PARTIALLY_SENT: { label: "Partially sent", className: "bg-amber-50 text-amber-800" },
  FAILED: { label: "Failed", className: "bg-red-50 text-red-700" },
  NO_RECIPIENTS: { label: "No recipients", className: "bg-neutral-100 text-neutral-600" },
};

/** Meeting reminder state for admin tables: ON/OFF, when it's scheduled, and the outcome once processed. */
export function ReminderBadge({
  enabled,
  status,
  scheduledFor,
  meetingStatus,
  isPast,
}: {
  enabled: boolean;
  status: MeetingReminderStatus | null;
  scheduledFor: string;
  meetingStatus: MeetingStatus;
  isPast: boolean;
}) {
  if (status) {
    const s = STATUS[status];
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
  }
  if (!enabled) return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">OFF</span>;
  if (isPast || meetingStatus !== "SCHEDULED") return <span className="text-xs text-neutral-400">—</span>;
  return (
    <span className="flex flex-col">
      <span className="w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">ON</span>
      <span className="mt-1 text-xs text-neutral-500">Scheduled {scheduledFor}</span>
    </span>
  );
}
