-- DropForeignKey
ALTER TABLE "chatbot_leads" DROP CONSTRAINT "chatbot_leads_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_memberId_fkey";

-- DropForeignKey
ALTER TABLE "visitors" DROP CONSTRAINT "visitors_eventId_fkey";

-- DropForeignKey
ALTER TABLE "weekly_report_recipients" DROP CONSTRAINT "weekly_report_recipients_chapterId_fkey";

-- AlterTable
ALTER TABLE "visitors" DROP COLUMN "eventId";

-- DropTable
DROP TABLE "chatbot_conversations";

-- DropTable
DROP TABLE "chatbot_leads";

-- DropTable
DROP TABLE "chatbot_settings";

-- DropTable
DROP TABLE "events";

-- DropTable
DROP TABLE "leads";

-- DropTable
DROP TABLE "weekly_report_recipients";

-- DropTable
DROP TABLE "weekly_report_settings";

-- DropEnum
DROP TYPE "ChatbotAccessMode";

-- DropEnum
DROP TYPE "ChatbotLeadStatus";

-- DropEnum
DROP TYPE "EventStatus";

-- DropEnum
DROP TYPE "EventType";

-- DropEnum
DROP TYPE "LeadSource";

-- DropEnum
DROP TYPE "LeadStatus";

-- DropEnum
DROP TYPE "WeeklyReportScope";

