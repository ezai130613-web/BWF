-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PROOF_UPLOAD', 'RAZORPAY', 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "meetingDates" DATE[],
ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'PROOF_UPLOAD',
ADD COLUMN     "razorpayPaymentId" TEXT,
ADD COLUMN     "reference" TEXT,
ALTER COLUMN "proofUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "razorpay_checkouts" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "membershipYear" INTEGER,
    "meetingDates" DATE[],
    "numberOfMonths" INTEGER NOT NULL DEFAULT 0,
    "amountInr" DECIMAL(10,2) NOT NULL,
    "linkId" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "paymentId" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razorpay_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_checkouts_linkId_key" ON "razorpay_checkouts"("linkId");

-- CreateIndex
CREATE UNIQUE INDEX "razorpay_checkouts_paymentId_key" ON "razorpay_checkouts"("paymentId");

-- CreateIndex
CREATE INDEX "razorpay_checkouts_memberId_idx" ON "razorpay_checkouts"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayPaymentId_key" ON "payments"("razorpayPaymentId");

-- AddForeignKey
ALTER TABLE "razorpay_checkouts" ADD CONSTRAINT "razorpay_checkouts_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

