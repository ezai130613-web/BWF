-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MEMBER_PROFILE_ENQUIRY', 'CONTACT_FORM', 'CHATBOT', 'MEMBERSHIP_ENQUIRY', 'VISITOR_REGISTRATION', 'EVENT_REGISTRATION', 'CATEGORY_WAITLIST');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DISCARDED');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "requirement" TEXT,
    "memberId" TEXT,
    "chapterId" TEXT,
    "categoryId" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_chapterId_idx" ON "leads"("chapterId");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "leads"("source");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
