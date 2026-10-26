-- CreateEnum
CREATE TYPE "AdminRemarkContext" AS ENUM ('MEMBERSHIP_APPROVAL', 'RENEWAL', 'GENERAL');

-- CreateTable
CREATE TABLE "admin_remarks" (
    "id" TEXT NOT NULL,
    "context" "AdminRemarkContext" NOT NULL,
    "body" TEXT NOT NULL,
    "memberId" TEXT,
    "applicationId" TEXT,
    "paymentId" TEXT,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_remarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_remarks_memberId_idx" ON "admin_remarks"("memberId");

-- CreateIndex
CREATE INDEX "admin_remarks_applicationId_idx" ON "admin_remarks"("applicationId");

-- AddForeignKey
ALTER TABLE "admin_remarks" ADD CONSTRAINT "admin_remarks_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_remarks" ADD CONSTRAINT "admin_remarks_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "membership_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_remarks" ADD CONSTRAINT "admin_remarks_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_remarks" ADD CONSTRAINT "admin_remarks_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
