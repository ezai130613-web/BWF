-- CreateEnum
CREATE TYPE "MemberProfileRevisionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "member_profile_revisions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "status" "MemberProfileRevisionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_profile_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_profile_revisions_memberId_status_idx" ON "member_profile_revisions"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profile_revisions" ADD CONSTRAINT "member_profile_revisions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profile_revisions" ADD CONSTRAINT "member_profile_revisions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

