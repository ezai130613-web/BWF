-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'ATTENDANCE';

-- AlterTable
ALTER TABLE "points_config" ADD COLUMN "perUnit" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "referrals" ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT;
