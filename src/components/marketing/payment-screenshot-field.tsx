"use client";

import { useRef, useState } from "react";

type PublicUploadKind = "image" | "identityDocument";

const ACCEPT: Record<PublicUploadKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  identityDocument: "image/jpeg,image/png,image/webp,application/pdf",
};

/** Public-themed counterpart to MediaUploadField — that one requires a signed-in
 * session (posts to /api/uploads); this posts to the public
 * /api/uploads/public-payment route instead, shared by /visit and /apply.
 * See that route's comment for why it's a separate endpoint rather than
 * loosening the admin one.
 *
 * `identityDocument` uploads (the Apply form's Aadhaar card) get back only an
 * object key, which is what the hidden input submits; no preview is shown
 * since the file has no public URL. */
export function PublicUploadField({
  name,
  label,
  kind = "image",
  required = false,
  hint,
  noun = "file",
  onUploadedChange,
}: {
  name: string;
  label: string;
  kind?: PublicUploadKind;
  required?: boolean;
  hint?: string;
  /** Button wording: "Upload {noun}" / "Replace {noun}". */
  noun?: string;
  onUploadedChange?: (uploaded: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [fileName, setFileName] = useState("");
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
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, kind }),
      });
      const presignBody = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignBody.error ?? "Couldn't start the upload.");

      const putRes = await fetch(presignBody.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");

      setValue((kind === "identityDocument" ? presignBody.key : presignBody.publicUrl) as string);
      setFileName(file.name);
      onUploadedChange?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
      <span>
        {label}
        {required ? <span className="text-gold-400"> *</span> : null}
      </span>
      {hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
      <input type="hidden" name={name} value={value} />

      {value && kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- R2 URL, not a next/image-managed asset
        <img src={value} alt="" className="h-24 w-24 rounded-md border border-emerald-600 object-cover" />
      ) : null}
      {value && kind === "identityDocument" ? (
        <span className="text-xs font-normal text-emerald-400">Uploaded: {fileName}</span>
      ) : null}

      <label className="w-fit cursor-pointer whitespace-nowrap rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm font-medium text-ivory-100 hover:border-gold-500/50">
        {uploading ? "Uploading…" : value ? `Replace ${noun}` : `Upload ${noun}`}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT[kind]}
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

export function PaymentScreenshotField({ name, label = "Upload Payment Screenshot (optional)" }: { name: string; label?: string }) {
  return <PublicUploadField name={name} label={label} noun="screenshot" />;
}
