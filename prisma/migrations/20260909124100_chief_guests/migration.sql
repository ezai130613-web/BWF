-- CreateTable
CREATE TABLE "chief_guests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "company" TEXT,
    "designation" TEXT,
    "description" TEXT,
    "chapterId" TEXT,
    "visitedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chief_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chief_guests_chapterId_idx" ON "chief_guests"("chapterId");

-- CreateIndex
CREATE INDEX "chief_guests_isPublished_idx" ON "chief_guests"("isPublished");

-- AddForeignKey
ALTER TABLE "chief_guests" ADD CONSTRAINT "chief_guests_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
