-- AlterTable
ALTER TABLE "members" ADD COLUMN "membershipPaidTerms" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
