-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "rate_limit_hits_expiresAt_idx" ON "rate_limit_hits"("expiresAt");

-- CreateIndex
CREATE INDEX "members_chapterId_idx" ON "members"("chapterId");

-- CreateIndex
CREATE INDEX "members_categoryId_idx" ON "members"("categoryId");

-- CreateIndex
CREATE INDEX "members_companyId_idx" ON "members"("companyId");

