import type { NextConfig } from "next";

// R2's public bucket URL (backlog #8) — lets next/image optimize our own
// uploaded media without a blanket remotePatterns allowlist. Conditional
// since STORAGE_PUBLIC_URL isn't set in every environment yet.
const storagePublicUrl = process.env.STORAGE_PUBLIC_URL;

// Legacy site redirects (2026-10-03). The previous buildersworldforum.com
// was a PHP site (e.g. Google still indexes /members-details.php?chapter=…),
// and Google's sitelinks under the search result — Membership Category,
// Founder's Message, Contact Us, Members Details, Membership Registration,
// About Us — still point at those old pages, which 404 on this site. The
// exact old filenames aren't on record (no Wayback archive exists), so each
// page's likely spellings are mapped, with and without ".php". Only names
// that can't collide with a real route here are mapped extensionless
// (bare "about"/"members" are this site's own pages; the root [slug] route
// only serves "<category>-in-<location>"). Permanent (308) so Google moves
// its index — and sitelinks — to the new URLs. Query strings pass through;
// /members ignores the old encrypted ?chapter= value (see its page).
const LEGACY_PAGES: { names: string[]; extensionless?: string[]; destination: string }[] = [
  { names: ["about-us", "aboutus", "about"], extensionless: ["about-us", "aboutus"], destination: "/about" },
  {
    names: ["founders-message", "founder-message", "founders_message", "founder", "founders"],
    extensionless: ["founders-message", "founder-message"],
    destination: "/about#founders",
  },
  { names: ["contact-us", "contactus", "contact"], extensionless: ["contact-us", "contactus"], destination: "/#contact" },
  { names: ["members-details", "member-details", "members"], extensionless: ["members-details", "member-details"], destination: "/members" },
  {
    names: ["membership-registration", "membership-form", "registration", "register"],
    extensionless: ["membership-registration"],
    destination: "/apply",
  },
  {
    names: ["membership-category", "membership-categories", "categories", "category"],
    extensionless: ["membership-category", "membership-categories"],
    destination: "/chapters",
  },
  { names: ["index", "home"], destination: "/" },
];

const legacyRedirects = [
  ...LEGACY_PAGES.flatMap(({ names, extensionless = [], destination }) => [
    ...names.map((name) => ({ source: `/${name}.php`, destination, permanent: true })),
    ...extensionless.map((name) => ({ source: `/${name}`, destination, permanent: true })),
  ]),
  // Any other old .php page (gallery, events, …) lands on the homepage
  // rather than a 404. Listed last so the specific mappings above win.
  { source: "/:path(.*\\.php)", destination: "/", permanent: true },
];

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects;
  },
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
