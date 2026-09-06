import Image from "next/image";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { cn } from "@/lib/utils";

/**
 * Renders a real photo when one exists, falling back to MediaPlaceholder
 * otherwise. Two source kinds share this component: (1) admin-supplied URLs
 * (Member.photoUrl, Blog.featuredImageUrl, Event.imageUrl — plain URL
 * fields, no object storage wired up yet per docs/ARCHITECTURE.md), which
 * default to `unoptimized` since they can point at any host an admin pastes
 * in and no remotePatterns allowlist exists (or should exist) for arbitrary
 * third-party links; and (2) our own files under `public/`, passed with
 * `unoptimized={false}` to get real Next.js image optimization since those
 * paths are same-origin and safe.
 */
export function PhotoSlot({
  src,
  alt,
  brief,
  className,
  unoptimized = true,
}: {
  src?: string | null;
  alt: string;
  brief: string;
  className?: string;
  unoptimized?: boolean;
}) {
  if (!src) {
    return <MediaPlaceholder brief={brief} className={className} />;
  }

  return (
    <div className={cn("relative overflow-hidden bg-emerald-900", className)}>
      <Image src={src} alt={alt} fill unoptimized={unoptimized} sizes="100vw" style={{ objectFit: "cover" }} />
    </div>
  );
}
