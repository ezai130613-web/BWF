-- AlterTable
ALTER TABLE "members" ADD COLUMN     "address" TEXT,
ADD COLUMN     "areasServed" TEXT,
ADD COLUMN     "brochureUrl" TEXT,
ADD COLUMN     "certifications" TEXT,
ADD COLUMN     "clientele" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "majorProjects" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "services" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "specialisations" TEXT,
ADD COLUMN     "usp" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "yearsInBusiness" INTEGER;

-- Backfill slug for any existing rows before enforcing NOT NULL — `prisma
-- migrate diff` generates a plain `NOT NULL` add which fails against
-- existing data, so this backfill step was added by hand.
UPDATE "members"
SET "slug" = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || substr(id, 1, 6)
WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "members" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "members_slug_key" ON "members"("slug");
