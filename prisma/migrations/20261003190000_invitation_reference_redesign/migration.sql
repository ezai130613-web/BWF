-- Invitation poster redesign to the client's reference (2026-10-03). Additive:
-- new columns + new column defaults. No rows existed at the time.
-- AlterTable
ALTER TABLE "meeting_invitations" ADD COLUMN     "backgroundPhotoUrl" TEXT,
ADD COLUMN     "contactPhones" TEXT,
ADD COLUMN     "ctaText" TEXT NOT NULL DEFAULT 'Call for Registration',
ADD COLUMN     "feeNote" TEXT,
ADD COLUMN     "guests" JSONB,
ADD COLUMN     "qrTarget" TEXT NOT NULL DEFAULT 'LOCATION',
ADD COLUMN     "websiteLabel" TEXT,
ALTER COLUMN "headingLine1" SET DEFAULT 'CHAPTER MEETING INVITATION',
ALTER COLUMN "headingLine2" SET DEFAULT 'NETWORKING FOR CONSTRUCTION MATERIAL SUPPLIERS AND PROFESSIONALS',
ALTER COLUMN "whyAttendText" SET DEFAULT 'Connect with builders, contractors, and suppliers in a focused networking space.';

