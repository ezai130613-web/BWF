"use client";

import { useRef, useState } from "react";
import type { MediaKind } from "@/lib/storage";

const ACCEPT_BY_KIND: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  pdf: "application/pdf",
  video: "video/mp4,video/webm,video/quicktime",
};

/**
 * Presigned-upload widget for member/company/testimonial/blog/event media
 * (backlog #8). Uploads go straight from the browser to R2 via a presigned
 * PUT URL from POST /api/uploads — the Next.js server never sees file bytes.
 * The URL text input stays editable so a paste-a-link workflow keeps working
 * (Member.videoUrl explicitly allows a Google Drive link, brief §47) and so
 * the field degrades to "manual URL entry" rather than breaking outright
 * when STORAGE_* env vars aren't set yet (POST /api/uploads then 503s with
 * a real error message instead of the upload silently doing nothing).
 */
export function MediaUploadField({
  label,
  name,
  defaultValue,
  kind,
  helperText,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  kind: MediaKind;
  helperText?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
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
        body: JSON.stringify({ kind, filename: file.name, contentType: file.type, size: file.size }),
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
      <span>{label}</span>

      {kind === "image" && value ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary/admin-pasted or R2 URL, not a next/image-managed asset
        <img src={value} alt="" className="h-20 w-20 rounded-md border border-neutral-200 object-cover" />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a URL, or upload a file"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <label className="cursor-pointer whitespace-nowrap rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          {uploading ? "Uploading…" : "Upload file"}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_BY_KIND[kind]}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="hidden"
          />
        </label>
      </div>

      {error ? <p className="text-xs font-normal text-red-600">{error}</p> : null}
      {helperText ? <p className="text-xs font-normal text-neutral-500">{helperText}</p> : null}
    </div>
  );
}
