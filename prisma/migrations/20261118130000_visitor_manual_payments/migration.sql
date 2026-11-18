-- AlterTable
ALTER TABLE "visitor_payments" ALTER COLUMN "proofUrl" DROP NOT NULL,
ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'PROOF_UPLOAD',
ADD COLUMN     "reference" TEXT;
