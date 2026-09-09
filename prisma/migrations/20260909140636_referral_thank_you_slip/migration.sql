-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('OUTSIDE', 'SELF');

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "type" "ReferralType" NOT NULL,
    "description" TEXT,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thank_you_slips" (
    "id" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "description" TEXT,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "referralId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thank_you_slips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referrals_fromMemberId_idx" ON "referrals"("fromMemberId");

-- CreateIndex
CREATE INDEX "referrals_toMemberId_idx" ON "referrals"("toMemberId");

-- CreateIndex
CREATE INDEX "thank_you_slips_fromMemberId_idx" ON "thank_you_slips"("fromMemberId");

-- CreateIndex
CREATE INDEX "thank_you_slips_toMemberId_idx" ON "thank_you_slips"("toMemberId");

-- CreateIndex
CREATE INDEX "thank_you_slips_referralId_idx" ON "thank_you_slips"("referralId");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thank_you_slips" ADD CONSTRAINT "thank_you_slips_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thank_you_slips" ADD CONSTRAINT "thank_you_slips_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thank_you_slips" ADD CONSTRAINT "thank_you_slips_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
