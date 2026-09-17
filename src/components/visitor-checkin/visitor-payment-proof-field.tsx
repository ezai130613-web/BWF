"use client";

import { useRef, useState } from "react";

/**
 * Visitor Management System (2026-09-18) — dark-themed proof upload for the
 * signed-out public visitor check-in form (same palette as
 * PaymentScreenshotField, since this page renders inside the public site's
 * dark layout, not a light admin/member surface). Posts to
 * /api/uploads/public-payment with kind: "paymentProof" (image or PDF, per
 * the spec) rather than /api/uploads (requires a session) or the plain
 * "image"-only default that route otherwise uses for /visit and /apply.
 */
export function VisitorPaymentProofField({ name }: { name: string }) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const presignRes = await fetch("/api/uploads/public-payment", {
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
    <div className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
      <span>Payment proof (screenshot, receipt, or PDF)</span>
      <input type="hidden" name={name} value={value} />

      {value ? <p className="text-xs font-normal text-gold-400">Uploaded ✓</p> : null}

      <label className="w-fit cursor-pointer whitespace-nowrap rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm font-medium text-ivory-100 hover:border-gold-500/50">
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

      {error ? <p className="text-xs font-normal text-red-400">{error}</p> : null}
    </div>
  );
}
