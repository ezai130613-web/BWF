-- CreateEnum
CREATE TYPE "PendingItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "pending_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "status" "PendingItemStatus" NOT NULL DEFAULT 'OPEN',
    "raisedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedOn" TIMESTAMP(3),
    "completedOn" TIMESTAMP(3),
    "remarks" TEXT,
    "chapterId" TEXT,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_items_raisedOn_idx" ON "pending_items"("raisedOn");

-- CreateIndex
CREATE INDEX "pending_items_chapterId_idx" ON "pending_items"("chapterId");

-- CreateIndex
CREATE INDEX "pending_items_assignedToUserId_idx" ON "pending_items"("assignedToUserId");

-- AddForeignKey
ALTER TABLE "pending_items" ADD CONSTRAINT "pending_items_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_items" ADD CONSTRAINT "pending_items_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
