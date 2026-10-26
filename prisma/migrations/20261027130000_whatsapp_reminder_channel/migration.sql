-- Phase 38 — meeting reminders also go out on WhatsApp; the delivery log records the channel.
-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- AlterTable
ALTER TABLE "meeting_reminder_logs" ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;
