-- CreateEnum
CREATE TYPE "RosterAssociateGroup" AS ENUM ('PRESIDENT', 'SECRETARY', 'TREASURER');

-- AlterTable
-- roster_assignments has zero rows in every environment as of this migration
-- (Phase 20 Batch 8's own follow-up note), so a required column needs no
-- backfill/default here.
ALTER TABLE "roster_assignments" ADD COLUMN "group" "RosterAssociateGroup" NOT NULL;

-- AlterTable
ALTER TABLE "members" ADD COLUMN "rosterEligible" BOOLEAN NOT NULL DEFAULT true;
