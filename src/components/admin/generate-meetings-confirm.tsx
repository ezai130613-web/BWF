"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNextMonthMeetings, type GeneratedMeetingResult } from "@/app/admin/(dashboard)/meetings/actions";

const formatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function GenerateMeetingsConfirm({
  target,
  createCount,
  label,
}: {
  target: { year: number; month: number };
  createCount: number;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<GeneratedMeetingResult | null>(null);

  if (result && !result.error) {
    return (
      <div className="rounded-lg border-2 border-emerald-700 bg-white p-5 text-sm">
        <h2 className="font-semibold text-neutral-900">
          Created {result.created?.length ?? 0} meeting{result.created?.length === 1 ? "" : "s"} for {label}
        </h2>
        {result.created && result.created.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-neutral-700">
            {result.created.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/meetings/${c.id}`} className="underline">
                  {c.chapterName} — {formatter.format(new Date(c.startsAt))}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {result.skipped && result.skipped.length > 0 ? (
          <>
            <h3 className="mt-4 font-semibold text-neutral-900">Skipped ({result.skipped.length})</h3>
            <ul className="mt-2 list-disc pl-5 text-neutral-600">
              {result.skipped.map((s, i) => (
                <li key={i}>
                  {s.chapterName}
                  {s.startsAt ? ` — ${formatter.format(new Date(s.startsAt))}` : ""}: {s.reason}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <Link href="/admin/meetings" className="mt-4 inline-block rounded-md bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-700">
          Back to Meetings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        disabled={pending || createCount === 0}
        onClick={() =>
          startTransition(async () => {
            const r = await createNextMonthMeetings(target);
            setResult(r);
            if (!r.error) router.refresh();
          })
        }
        className="rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : createCount === 0 ? "Nothing to create" : `Confirm — create ${createCount} meeting${createCount === 1 ? "" : "s"}`}
      </button>
      <Link href="/admin/meetings" className="text-sm text-neutral-500 hover:text-neutral-900">
        Cancel
      </Link>
      {result?.error ? <p className="w-full text-sm text-red-700">{result.error}</p> : null}
    </div>
  );
}
