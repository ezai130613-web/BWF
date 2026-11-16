"use client";

import { useActionState, useRef, useTransition } from "react";
import { deletePendingItem, savePendingItem } from "@/app/admin/(dashboard)/accounts/pending-items/actions";

type Result = { error?: string; ok?: boolean } | undefined;
export type PendingItemValues = {
  id: string;
  title: string;
  details: string;
  remarks: string;
  chapterId: string;
  assignedToUserId: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  /** YYYY-MM-DD (IST) */
  raisedOn: string;
  expectedOn: string;
};

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";
const label = "flex flex-col gap-1.5 text-sm font-medium text-neutral-700";

export function PendingItemForm({ chapters, admins, item, today }: { chapters: { id: string; name: string }[]; admins: { id: string; name: string }[]; item?: PendingItemValues; today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: Result, formData: FormData): Promise<Result> => {
    const result = await savePendingItem(item?.id ?? null, prev, formData);
    if (result?.ok && !item) formRef.current?.reset();
    return result;
  }, undefined);
  const [deleting, startDelete] = useTransition();

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        Pending point
        <input name="title" required maxLength={300} defaultValue={item?.title} className={input} placeholder="e.g. Chennai chapter renewal payments to be collected" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Details (optional)
        <textarea name="details" rows={2} maxLength={2000} defaultValue={item?.details} className={input} />
      </label>
      <label className={label}>
        Chapter
        <select name="chapterId" defaultValue={item?.chapterId ?? ""} className={input}>
          <option value="">All chapters</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Assigned to
        <select name="assignedToUserId" defaultValue={item?.assignedToUserId ?? ""} className={input}>
          <option value="">Unassigned</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Status
        <select name="status" defaultValue={item?.status ?? "OPEN"} className={input}>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </select>
      </label>
      <label className={label}>
        Raised on (as on date)
        <input name="raisedOn" type="date" defaultValue={item?.raisedOn ?? today} className={input} />
      </label>
      <label className={label}>
        Expected date of completion
        <input name="expectedOn" type="date" defaultValue={item?.expectedOn} className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Remarks (optional)
        <textarea name="remarks" rows={2} maxLength={2000} defaultValue={item?.remarks} className={input} />
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-700 sm:col-span-2">{item ? "Saved." : "Pending point added."}</p> : null}

      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
          {pending ? "Saving…" : item ? "Save changes" : "Add pending point"}
        </button>
        {item ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm("Delete this pending point?")) return;
              startDelete(() => deletePendingItem(item.id));
            }}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
