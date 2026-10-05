-- 2026-10-05 client correction: optional GST number on a company (entered
-- from the Add member form or the Companies page). Additive only.
ALTER TABLE "companies" ADD COLUMN "gstNumber" TEXT;

CREATE UNIQUE INDEX "companies_gstNumber_key" ON "companies"("gstNumber");
