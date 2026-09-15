-- AlterTable
ALTER TABLE "members" ADD COLUMN     "referredByMemberId" TEXT;

-- CreateTable
CREATE TABLE "consumers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_chief_guests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "designation" TEXT,
    "notes" TEXT,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_chief_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumers_memberId_idx" ON "consumers"("memberId");

-- CreateIndex
CREATE INDEX "member_chief_guests_memberId_idx" ON "member_chief_guests"("memberId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_referredByMemberId_fkey" FOREIGN KEY ("referredByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumers" ADD CONSTRAINT "consumers_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_chief_guests" ADD CONSTRAINT "member_chief_guests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

