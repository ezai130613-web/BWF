-- CreateEnum
CREATE TYPE "VisitorSource" AS ENUM ('INVITED_BY_MEMBER', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'GOOGLE_SEARCH', 'WHATSAPP', 'REFERRAL', 'OTHER');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "visitorAttendanceQrToken" TEXT,
ADD COLUMN     "visitorCheckInOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "visitor_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "companyName" TEXT,
    "businessCategory" TEXT,
    "description" TEXT,
    "convertedMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_attendances" (
    "id" TEXT NOT NULL,
    "visitorProfileId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "source" "VisitorSource" NOT NULL,
    "sourceDetails" TEXT,
    "invitingMemberId" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkedInAt" TIMESTAMP(3),
    "correctedByUserId" TEXT,
    "correctionReason" TEXT,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_payments" (
    "id" TEXT NOT NULL,
    "visitorAttendanceId" TEXT NOT NULL,
    "amountInr" DECIMAL(10,2) NOT NULL,
    "actualPaymentDate" TIMESTAMP(3) NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "status" "PaymentApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_profiles_phone_idx" ON "visitor_profiles"("phone");

-- CreateIndex
CREATE INDEX "visitor_attendances_visitorProfileId_idx" ON "visitor_attendances"("visitorProfileId");

-- CreateIndex
CREATE INDEX "visitor_attendances_chapterId_idx" ON "visitor_attendances"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_attendances_meetingId_visitorProfileId_key" ON "visitor_attendances"("meetingId", "visitorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_payments_visitorAttendanceId_key" ON "visitor_payments"("visitorAttendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_payments_idempotencyKey_key" ON "visitor_payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "visitor_payments_status_idx" ON "visitor_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_visitorAttendanceQrToken_key" ON "meetings"("visitorAttendanceQrToken");

-- AddForeignKey
ALTER TABLE "visitor_profiles" ADD CONSTRAINT "visitor_profiles_convertedMemberId_fkey" FOREIGN KEY ("convertedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_attendances" ADD CONSTRAINT "visitor_attendances_visitorProfileId_fkey" FOREIGN KEY ("visitorProfileId") REFERENCES "visitor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_attendances" ADD CONSTRAINT "visitor_attendances_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_attendances" ADD CONSTRAINT "visitor_attendances_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_attendances" ADD CONSTRAINT "visitor_attendances_invitingMemberId_fkey" FOREIGN KEY ("invitingMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_payments" ADD CONSTRAINT "visitor_payments_visitorAttendanceId_fkey" FOREIGN KEY ("visitorAttendanceId") REFERENCES "visitor_attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

