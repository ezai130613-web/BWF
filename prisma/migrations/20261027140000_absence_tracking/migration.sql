-- Phase 39 — automatic absence marking, 2-in-a-row warnings, 3-in-a-row admin reviews.
-- CreateEnum
CREATE TYPE "AbsenceReviewStatus" AS ENUM ('OPEN', 'COURTESY_GRANTED', 'MEMBER_REMOVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "attendanceClosedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "absence_warnings" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL,
    "emailStatus" TEXT NOT NULL,
    "emailError" TEXT,
    "whatsappStatus" TEXT NOT NULL,
    "whatsappError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_reviews" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "AbsenceReviewStatus" NOT NULL DEFAULT 'OPEN',
    "streak" INTEGER NOT NULL,
    "absentMeetingIds" JSONB NOT NULL,
    "lastAbsentMeetingAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "decisionNote" TEXT,
    "excusedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absence_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "absence_warnings_createdAt_idx" ON "absence_warnings"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "absence_warnings_memberId_meetingId_key" ON "absence_warnings"("memberId", "meetingId");

-- CreateIndex
CREATE INDEX "absence_reviews_status_idx" ON "absence_reviews"("status");

-- CreateIndex
CREATE INDEX "absence_reviews_memberId_idx" ON "absence_reviews"("memberId");

-- AddForeignKey
ALTER TABLE "absence_warnings" ADD CONSTRAINT "absence_warnings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_warnings" ADD CONSTRAINT "absence_warnings_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_reviews" ADD CONSTRAINT "absence_reviews_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absence_reviews" ADD CONSTRAINT "absence_reviews_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Absence tracking starts counting from the moment this migration runs, so
-- attendance from before this release never triggers warnings. Admins can
-- turn it off (or restart the count) from Settings.
INSERT INTO "app_settings" ("key", "value", "updatedAt")
VALUES ('attendance.absenceTrackingFrom', to_jsonb(to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), now())
ON CONFLICT ("key") DO NOTHING;
