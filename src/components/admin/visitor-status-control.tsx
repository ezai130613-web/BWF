"use client";

import { useTransition } from "react";
import { updateVisitorStatus } from "@/app/admin/(dashboard)/visitors/actions";
import type { $Enums } from "@/generated/prisma/client";

const STATUSES: $Enums.VisitorStatus[] = [
  "REGISTERED",
  "ATTENDED",
  "FOLLOW_UP_REQUIRED",
  "INTERESTED_IN_MEMBERSHIP",
  "APPLICATION_SUBMITTED",
  "CONVERTED",
  "NOT_INTERESTED",
];

export function VisitorStatusControl({ visitorId, status }: { visitorId: string; status: $Enums.VisitorStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateVisitorStatus(visitorId, e.target.value as $Enums.VisitorStatus))}
      className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
