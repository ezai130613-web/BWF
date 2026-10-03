-- 2026-10-03 member portal & admin corrections. Additive only: new nullable/defaulted
-- columns, three new tables, users.email relaxed to nullable. No data is removed.

-- CreateEnum
CREATE TYPE "MeetingReminderStatus" AS ENUM ('SENDING', 'SENT', 'PARTIALLY_SENT', 'FAILED', 'NO_RECIPIENTS');

-- CreateEnum
CREATE TYPE "ReminderDeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RosterOrderMode" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "meetingTime" TEXT,
ADD COLUMN     "meetingWeekday" INTEGER,
ADD COLUMN     "meetingWeeksOfMonth" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "company" TEXT,
ADD COLUMN     "invitedByMemberId" TEXT,
ADD COLUMN     "meetingId" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rating" INTEGER;

-- AlterTable
ALTER TABLE "meetings" ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderProcessedAt" TIMESTAMP(3),
ADD COLUMN     "reminderStatus" "MeetingReminderStatus";

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationLabel" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "otp_challenges" ADD COLUMN     "target" TEXT;

-- AlterTable
ALTER TABLE "roster_scores" ADD COLUMN     "systemPoints" INTEGER;

-- AlterTable
ALTER TABLE "rosters" ADD COLUMN     "orderMode" "RosterOrderMode" NOT NULL DEFAULT 'AUTO';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporaryPasswordIssuedAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "meeting_reminder_logs" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT,
    "email" TEXT NOT NULL,
    "status" "ReminderDeliveryStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "feedback_email_recipients" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_email_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meeting_reminder_logs_meetingId_idx" ON "meeting_reminder_logs"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_email_recipients_email_key" ON "feedback_email_recipients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_invitedByMemberId_fkey" FOREIGN KEY ("invitedByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_reminder_logs" ADD CONSTRAINT "meeting_reminder_logs_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_reminder_logs" ADD CONSTRAINT "meeting_reminder_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill the structured recurring schedule from each chapter's existing
-- free-text meetingSchedule (e.g. "2nd & 4th Thursday"). Start time 07:00 IST
-- per the client (2026-10-03); admins can change any of this per chapter.
UPDATE "chapters" SET "meetingWeekday" = CASE
    WHEN "meetingSchedule" ILIKE '%sunday%' THEN 0
    WHEN "meetingSchedule" ILIKE '%monday%' THEN 1
    WHEN "meetingSchedule" ILIKE '%tuesday%' THEN 2
    WHEN "meetingSchedule" ILIKE '%wednesday%' THEN 3
    WHEN "meetingSchedule" ILIKE '%thursday%' THEN 4
    WHEN "meetingSchedule" ILIKE '%friday%' THEN 5
    WHEN "meetingSchedule" ILIKE '%saturday%' THEN 6
  END
WHERE "meetingSchedule" IS NOT NULL;

UPDATE "chapters" SET "meetingWeeksOfMonth" = ARRAY_REMOVE(ARRAY[
    CASE WHEN "meetingSchedule" ~* '(1st|first)' THEN 1 END,
    CASE WHEN "meetingSchedule" ~* '(2nd|second)' THEN 2 END,
    CASE WHEN "meetingSchedule" ~* '(3rd|third)' THEN 3 END,
    CASE WHEN "meetingSchedule" ~* '(4th|fourth)' THEN 4 END,
    CASE WHEN "meetingSchedule" ~* '(5th|fifth)' THEN 5 END
  ], NULL)
WHERE "meetingSchedule" IS NOT NULL;

UPDATE "chapters" SET "meetingTime" = '07:00' WHERE "meetingWeekday" IS NOT NULL;
