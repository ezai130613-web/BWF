-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'CONTACTED', 'MEETING_SCHEDULED', 'APPROVED_IN_PRINCIPLE', 'WAITING_FOR_PAYMENT', 'PAID', 'REJECTED', 'WAITLISTED');

-- CreateTable
CREATE TABLE "membership_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "designation" TEXT,
    "yearsInBusiness" INTEGER,
    "referralSource" TEXT,
    "companyInfo" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "categoryId" TEXT NOT NULL,
    "chapterId" TEXT,
    "convertedMemberId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_applications_convertedMemberId_key" ON "membership_applications"("convertedMemberId");

-- AddForeignKey
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_convertedMemberId_fkey" FOREIGN KEY ("convertedMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

