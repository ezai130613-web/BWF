-- AlterTable
ALTER TABLE "members" ADD COLUMN "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "services" TEXT,
ADD COLUMN "areasServed" TEXT,
ADD COLUMN "gstNumber" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "youtubeUrl" TEXT,
ADD COLUMN "linkedinUrl" TEXT,
ADD COLUMN "instagramUrl" TEXT,
ADD COLUMN "facebookUrl" TEXT,
ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "companyLogoUrl" TEXT,
ADD COLUMN "aadhaarFileKey" TEXT;
