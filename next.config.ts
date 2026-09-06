import type { NextConfig } from "next";

// R2's public bucket URL (backlog #8) — lets next/image optimize our own
// uploaded media without a blanket remotePatterns allowlist. Conditional
// since STORAGE_PUBLIC_URL isn't set in every environment yet.
const storagePublicUrl = process.env.STORAGE_PUBLIC_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: storagePublicUrl ? [{ protocol: "https", hostname: new URL(storagePublicUrl).hostname }] : [],
  },
  // Enables next/navigation's forbidden() + forbidden.tsx (backlog #14) — still
  // experimental per Next's own docs as of this version, but it's the only
  // mechanism that survives production's error-detail redaction (see
  // docs/ARCHITECTURE.md's note on why the old error.tsx-based attempt didn't).
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
