-- CreateTable
CREATE TABLE "one_to_ones" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT NOT NULL,
    "withMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_to_ones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "power_dates" (
    "id" TEXT NOT NULL,
    "externalContactName" TEXT NOT NULL,
    "externalContactCompany" TEXT,
    "notes" TEXT,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hostMemberId" TEXT NOT NULL,
    "participantMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "power_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conclaves" (
    "id" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizedByMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conclaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conclave_participants" (
    "id" TEXT NOT NULL,
    "conclaveId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "conclave_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "one_to_ones_memberId_idx" ON "one_to_ones"("memberId");

-- CreateIndex
CREATE INDEX "one_to_ones_withMemberId_idx" ON "one_to_ones"("withMemberId");

-- CreateIndex
CREATE INDEX "power_dates_hostMemberId_idx" ON "power_dates"("hostMemberId");

-- CreateIndex
CREATE INDEX "power_dates_participantMemberId_idx" ON "power_dates"("participantMemberId");

-- CreateIndex
CREATE INDEX "conclaves_organizedByMemberId_idx" ON "conclaves"("organizedByMemberId");

-- CreateIndex
CREATE INDEX "conclave_participants_memberId_idx" ON "conclave_participants"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "conclave_participants_conclaveId_memberId_key" ON "conclave_participants"("conclaveId", "memberId");

-- AddForeignKey
ALTER TABLE "one_to_ones" ADD CONSTRAINT "one_to_ones_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_to_ones" ADD CONSTRAINT "one_to_ones_withMemberId_fkey" FOREIGN KEY ("withMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_dates" ADD CONSTRAINT "power_dates_hostMemberId_fkey" FOREIGN KEY ("hostMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "power_dates" ADD CONSTRAINT "power_dates_participantMemberId_fkey" FOREIGN KEY ("participantMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclaves" ADD CONSTRAINT "conclaves_organizedByMemberId_fkey" FOREIGN KEY ("organizedByMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclave_participants" ADD CONSTRAINT "conclave_participants_conclaveId_fkey" FOREIGN KEY ("conclaveId") REFERENCES "conclaves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conclave_participants" ADD CONSTRAINT "conclave_participants_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
