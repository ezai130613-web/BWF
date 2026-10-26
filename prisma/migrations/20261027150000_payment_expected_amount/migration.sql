-- Phase 40 — the amount a payment should have come to, for admin comparison.
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "expectedAmountInr" DECIMAL(10,2);
