-- CreateEnum
CREATE TYPE "MarketingPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'PINTEREST');

-- CreateEnum
CREATE TYPE "PlatformConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "ScheduledPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "PublishAttemptResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "marketing_content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_connections" (
    "id" TEXT NOT NULL,
    "platform" "MarketingPlatform" NOT NULL,
    "status" "PlatformConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "accountName" TEXT,
    "accountId" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "platform" "MarketingPlatform" NOT NULL,
    "connectionId" TEXT,
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'DRAFT',
    "caption" TEXT,
    "hashtags" TEXT,
    "title" TEXT,
    "destinationLink" TEXT,
    "boardId" TEXT,
    "boardName" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "publishedUrl" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_attempts" (
    "id" TEXT NOT NULL,
    "scheduledPostId" TEXT NOT NULL,
    "result" "PublishAttemptResult" NOT NULL,
    "errorMessage" TEXT,
    "publishedUrl" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_connections_platform_key" ON "platform_connections"("platform");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_scheduledFor_idx" ON "scheduled_posts"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "scheduled_posts_contentId_idx" ON "scheduled_posts"("contentId");

-- CreateIndex
CREATE INDEX "publish_attempts_scheduledPostId_idx" ON "publish_attempts"("scheduledPostId");

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "marketing_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "platform_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_attempts" ADD CONSTRAINT "publish_attempts_scheduledPostId_fkey" FOREIGN KEY ("scheduledPostId") REFERENCES "scheduled_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
