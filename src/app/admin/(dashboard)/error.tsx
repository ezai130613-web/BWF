"use client";

export default function AdminError({ error }: { error: Error & { digest?: string } }) {
  const isForbidden = error.name === "ForbiddenError";

  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-neutral-200 bg-white p-8">
      <h1 className="text-lg font-semibold text-neutral-900">
        {isForbidden ? "You don't have access to this." : "Something went wrong."}
      </h1>
      <p className="text-sm text-neutral-600">{error.message}</p>
    </div>
  );
}
