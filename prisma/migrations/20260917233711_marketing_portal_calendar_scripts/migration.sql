-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('REEL', 'POST', 'CAROUSEL', 'STORY', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentPlanStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'READY', 'SCHEDULED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('DRAFT', 'FINALISED');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "content_plan_entries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "contentType" "ContentFormat" NOT NULL DEFAULT 'OTHER',
    "platform" "CalendarPlatform" NOT NULL DEFAULT 'OTHER',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT,
    "status" "ContentPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_plan_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_scripts" (
    "id" TEXT NOT NULL,
    "scriptNumber" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "contentType" "ContentFormat" NOT NULL DEFAULT 'OTHER',
    "content" TEXT NOT NULL,
    "status" "ScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_plan_entries_scheduledFor_idx" ON "content_plan_entries"("scheduledFor");

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_idx" ON "ai_messages"("conversationId");

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
