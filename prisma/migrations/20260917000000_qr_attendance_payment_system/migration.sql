
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "PaymentApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "attendanceQrToken" TEXT,
ADD COLUMN     "attendanceRegistrationOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkInClosesAt" TIMESTAMP(3),
ADD COLUMN     "checkInOpensAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "correctedByUserId" TEXT,
    "correctionReason" TEXT,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "numberOfMonths" INTEGER NOT NULL,
    "monthsCovered" JSONB NOT NULL,
    "amountPaidInr" DECIMAL(10,2) NOT NULL,
    "actualPaymentDate" TIMESTAMP(3) NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "status" "PaymentApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "overlapsApprovedCoverage" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_memberId_idx" ON "attendances"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_meetingId_memberId_key" ON "attendances"("meetingId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_memberId_idx" ON "payments"("memberId");

-- CreateIndex
CREATE INDEX "payments_meetingId_idx" ON "payments"("meetingId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_attendanceQrToken_key" ON "meetings"("attendanceQrToken");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

