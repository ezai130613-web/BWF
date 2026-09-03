-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CHAPTER_MEETING', 'NETWORKING_EVENT', 'SEMINAR', 'EXHIBITION', 'CHAPTER_LAUNCH', 'SPECIAL_EVENT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitorStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'FOLLOW_UP_REQUIRED', 'INTERESTED_IN_MEMBERSHIP', 'APPLICATION_SUBMITTED', 'CONVERTED', 'NOT_INTERESTED');

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "address" TEXT,
    "googleMapsUrl" TEXT,
    "agenda" TEXT,
    "speaker" TEXT,
    "description" TEXT,
    "visitorRegistrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "EventType" NOT NULL DEFAULT 'SPECIAL_EVENT',
    "chapterId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "imageUrl" TEXT,
    "registrationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "registrationDeadline" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "status" "VisitorStatus" NOT NULL DEFAULT 'REGISTERED',
    "categoryId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "meetingId" TEXT,
    "eventId" TEXT,
    "referringMemberId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meetings_chapterId_startsAt_idx" ON "meetings"("chapterId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_referringMemberId_fkey" FOREIGN KEY ("referringMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

