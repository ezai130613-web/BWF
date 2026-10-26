-- Phase 37 — member birthdays (Socials page)
ALTER TABLE "members" ADD COLUMN "birthDay" INTEGER,
ADD COLUMN "birthMonth" INTEGER,
ADD COLUMN "birthYear" INTEGER;

-- CreateIndex
CREATE INDEX "members_birthMonth_birthDay_idx" ON "members"("birthMonth", "birthDay");
