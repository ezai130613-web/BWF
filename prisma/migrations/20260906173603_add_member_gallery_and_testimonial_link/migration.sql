-- AlterTable
ALTER TABLE "members" ADD COLUMN     "photos" JSONB,
ADD COLUMN     "videos" JSONB;

-- AlterTable
ALTER TABLE "testimonials" ADD COLUMN     "memberId" TEXT;

-- CreateIndex
CREATE INDEX "testimonials_memberId_idx" ON "testimonials"("memberId");

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
