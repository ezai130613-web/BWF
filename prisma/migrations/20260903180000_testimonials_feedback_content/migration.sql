-- CreateEnum
CREATE TYPE "TestimonialType" AS ENUM ('MEMBER', 'VISITOR', 'CLIENT', 'VIDEO', 'SUCCESS_STORY');

-- CreateEnum
CREATE TYPE "TestimonialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('MEETING', 'EVENT', 'MANAGEMENT', 'GENERAL');

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "content" TEXT NOT NULL,
    "type" "TestimonialType" NOT NULL DEFAULT 'MEMBER',
    "status" "TestimonialStatus" NOT NULL DEFAULT 'PENDING',
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "rating" INTEGER,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "chapterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL DEFAULT 'GENERAL',
    "name" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "chapterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_content" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_content_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "site_faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonials_status_featured_idx" ON "testimonials"("status", "featured");

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

