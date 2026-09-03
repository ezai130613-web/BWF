-- CreateEnum
CREATE TYPE "WeeklyReportScope" AS ENUM ('MASTER', 'CHAPTER');

-- CreateTable
CREATE TABLE "weekly_report_recipients" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "scope" "WeeklyReportScope" NOT NULL DEFAULT 'MASTER',
    "chapterId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_report_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_report_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dayOfWeek" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_report_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "weekly_report_recipients" ADD CONSTRAINT "weekly_report_recipients_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

