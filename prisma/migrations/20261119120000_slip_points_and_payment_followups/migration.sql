-- AlterTable
ALTER TABLE "thank_you_slips" ADD COLUMN "pointsPercent" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "pointsNote" TEXT;

-- CreateTable
CREATE TABLE "payment_follow_ups" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "nextFollowUpOn" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_follow_ups_memberId_createdAt_idx" ON "payment_follow_ups"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "payment_follow_ups" ADD CONSTRAINT "payment_follow_ups_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
