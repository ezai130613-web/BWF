-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('REFERRAL', 'THANK_YOU_SLIP', 'ONE_TO_ONE', 'POWER_DATE', 'CONCLAVE', 'VISITOR', 'CONSUMER', 'CHIEF_GUEST', 'INDUCTION');

-- CreateTable
CREATE TABLE "points_config" (
    "id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "points_config_activityType_key" ON "points_config"("activityType");
