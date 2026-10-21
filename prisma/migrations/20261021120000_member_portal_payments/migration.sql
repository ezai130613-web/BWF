-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('MEETING', 'MEMBERSHIP');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "membershipYear" INTEGER,
ADD COLUMN     "type" "PaymentType" NOT NULL DEFAULT 'MEETING',
ALTER COLUMN "meetingId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

