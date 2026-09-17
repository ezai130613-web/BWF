-- DropForeignKey
ALTER TABLE "scheduled_posts" DROP CONSTRAINT "scheduled_posts_contentId_fkey";

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "marketing_content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
