/**
 * Static BWF roster content (2026-09-16 correction, requirement 7) — wording
 * transcribed verbatim from the 3 real reference roster PDFs
 * (docs/reference/roster-sheets/), which are scanned/flattened images with
 * no extractable text, so this was read directly off the rendered pages
 * (PyMuPDF page images), not guessed or rewritten. All 3 references carry
 * the exact same Pledge wording; the Self-Introduction block's heading
 * differs only in "Visitors" (Chapter 1) vs "Guest" (Chapters 2 and 3) —
 * standardized on "Guest" here per the client's own phrasing and since it's
 * the majority wording across the 3 references.
 *
 * The client's brief also asked for "BWF rules and regulations" as a
 * distinct static section — checked all 3 references page-by-page and no
 * such block exists anywhere in them. Per the client (2026-09-16 planning
 * conversation): the Pledge below stands in for "oath and pledge," and
 * nothing is invented for "rules and regulations" since no source wording
 * exists for it.
 *
 * Single source of truth for both the PDF (src/lib/roster/generate.ts) and
 * the on-page wizard preview (src/components/admin/roster-wizard.tsx) —
 * imported by both so they can never drift apart, per requirement 8's "the
 * preview must closely match the final PDF."
 */

export const GUEST_SELF_INTRODUCTION_HEADING = "BWF – Guest Self Introduction Format";

export const GUEST_SELF_INTRODUCTION_SALUTATION = "Dear Guest,";

export const GUEST_SELF_INTRODUCTION_INSTRUCTIONS =
  "You will be given 15 seconds to briefly introduce yourself. Please use the format below and kindly stick to the time.";

export const GUEST_SELF_INTRODUCTION_LINES = [
  "I am ______________________ (your name) from ______________________ (company name)",
  "We do ______________________________________________ (description of your products / services)",
  "I thank ______________________________________ (member name) for inviting me.",
];

export const PLEDGE_HEADING = "Builders World Forum Pledge";

export const PLEDGE_LINES = [
  "We, Builders world forum members, commit to valuing and supporting our fellow co-members to enhance their business success.",
  "We will prioritize referrals received from co-members, providing exceptional service and competitive pricing",
  "We pledge to work collaboratively as a group, promoting unity and shared goals within the Builders World Forum.",
  "We are dedicated to contributing positively to the construction industry as a whole, fostering growth and innovation.",
];
