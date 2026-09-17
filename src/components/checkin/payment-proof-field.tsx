"use client";

import { useRef, useState } from "react";

/**
 * Light/member-portal-themed proof upload — posts to the authenticated
 * /api/uploads (open to any signed-in session, see that route's own
 * comment), unlike the public /visit and /apply forms which use the
 * signed-out /api/uploads/public-payment route. Accepts image or PDF
 * (kind: "paymentProof") per the spec's "screenshot, receipt or PDF."
 */
export function PaymentProofField({ name }: { name: string }) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const presignRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "paymentProof", filename: file.name, contentType: file.type, size: file.size }),
      });
      const presignBody = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignBody.error ?? "Couldn't start the upload.");

      const putRes = await fetch(presignBody.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");

      setValue(presignBody.publicUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      <span>Payment proof (screenshot, receipt, or PDF)</span>
      <input type="hidden" name={name} value={value} />

      {value ? <p className="text-xs font-normal text-emerald-700">Uploaded ✓</p> : null}

      <label className="w-fit cursor-pointer whitespace-nowrap rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
        {uploading ? "Uploading…" : value ? "Replace file" : "Upload file"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="hidden"
        />
      </label>

      {error ? <p className="text-xs font-normal text-red-600">{error}</p> : null}
    </div>
  );
}
