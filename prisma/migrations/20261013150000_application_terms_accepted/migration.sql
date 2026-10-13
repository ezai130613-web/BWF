-- 2026-10-13 client correction: applicants must accept the Membership Terms &
-- Conditions before submitting /apply. Records when they did; null on
-- applications submitted before the requirement existed.
ALTER TABLE "membership_applications" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
