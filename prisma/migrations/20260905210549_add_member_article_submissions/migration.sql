-- CreateEnum
CREATE TYPE "BlogSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "blogs" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "submissionStatus" "BlogSubmissionStatus",
ADD COLUMN     "submittedByMemberId" TEXT;

-- CreateIndex
CREATE INDEX "blogs_submissionStatus_idx" ON "blogs"("submissionStatus");

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_submittedByMemberId_fkey" FOREIGN KEY ("submittedByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
