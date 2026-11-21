-- AlterTable
ALTER TABLE "rosters" ADD COLUMN "includeCoordinators" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "includeFounders" BOOLEAN NOT NULL DEFAULT false;
