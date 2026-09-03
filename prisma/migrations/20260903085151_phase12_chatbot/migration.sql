-- CreateEnum
CREATE TYPE "ChatbotAccessMode" AS ENUM ('PUBLIC', 'LOGIN_REQUIRED', 'LIMITED_FREE_QUESTIONS');

-- CreateEnum
CREATE TYPE "ChatbotLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DISCARDED');

-- CreateTable
CREATE TABLE "chatbot_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "accessMode" "ChatbotAccessMode" NOT NULL DEFAULT 'PUBLIC',
    "freeQuestionsLimit" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_conversations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_leads" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "requirement" TEXT NOT NULL,
    "status" "ChatbotLeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_conversations_sessionId_key" ON "chatbot_conversations"("sessionId");

-- CreateIndex
CREATE INDEX "chatbot_leads_status_idx" ON "chatbot_leads"("status");

-- AddForeignKey
ALTER TABLE "chatbot_leads" ADD CONSTRAINT "chatbot_leads_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chatbot_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

