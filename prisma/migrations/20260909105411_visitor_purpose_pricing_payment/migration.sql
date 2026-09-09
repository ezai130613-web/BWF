-- CreateEnum
CREATE TYPE "VisitorPurpose" AS ENUM ('PROSPECTIVE_MEMBER', 'END_CONSUMER', 'CHIEF_GUEST');

-- CreateEnum
CREATE TYPE "VisitorMeetingOption" AS ENUM ('MEETING_ONLY', 'MEETING_BREAKFAST');

-- AlterTable
ALTER TABLE "visitors" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "meetingOption" "VisitorMeetingOption",
ADD COLUMN     "paymentScreenshotUrl" TEXT,
ADD COLUMN     "purposeOfVisit" "VisitorPurpose";
