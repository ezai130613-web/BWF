-- CreateIndex
CREATE INDEX "blogs_authorId_idx" ON "blogs"("authorId");

-- CreateIndex
CREATE INDEX "blogs_categoryId_idx" ON "blogs"("categoryId");

-- CreateIndex
CREATE INDEX "events_chapterId_idx" ON "events"("chapterId");

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
