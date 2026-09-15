-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "speaker",
ADD COLUMN     "chiefGuestId" TEXT;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_chiefGuestId_fkey" FOREIGN KEY ("chiefGuestId") REFERENCES "chief_guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
