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
CREATE INDEX "blogs_authorId_idx" ON "blogs"("authorId");

-- CreateIndex
CREATE INDEX "blogs_categoryId_idx" ON "blogs"("categoryId");

-- CreateIndex
CREATE INDEX "events_chapterId_idx" ON "events"("chapterId");

-- CreateIndex
CREATE INDEX "members_chapterId_idx" ON "members"("chapterId");

-- CreateIndex
CREATE INDEX "members_categoryId_idx" ON "members"("categoryId");

-- CreateIndex
CREATE INDEX "members_companyId_idx" ON "members"("companyId");

-- CreateIndex
CREATE INDEX "membership_applications_chapterId_idx" ON "membership_applications"("chapterId");

-- CreateIndex
CREATE INDEX "membership_applications_categoryId_idx" ON "membership_applications"("categoryId");

-- CreateIndex
CREATE INDEX "testimonials_chapterId_idx" ON "testimonials"("chapterId");

-- CreateIndex
CREATE INDEX "visitors_chapterId_idx" ON "visitors"("chapterId");

-- CreateIndex
CREATE INDEX "visitors_categoryId_idx" ON "visitors"("categoryId");

