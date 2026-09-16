-- CreateTable
CREATE TABLE "rosters" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "notesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "savedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_scores" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roster_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToRoster" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToRoster_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ChiefGuestToRoster" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChiefGuestToRoster_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "rosters_meetingId_key" ON "rosters"("meetingId");

-- CreateIndex
CREATE INDEX "roster_scores_rosterId_idx" ON "roster_scores"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "roster_scores_rosterId_memberId_key" ON "roster_scores"("rosterId", "memberId");

-- CreateIndex
CREATE INDEX "_CategoryToRoster_B_index" ON "_CategoryToRoster"("B");

-- CreateIndex
CREATE INDEX "_ChiefGuestToRoster_B_index" ON "_ChiefGuestToRoster"("B");

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_scores" ADD CONSTRAINT "roster_scores_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_scores" ADD CONSTRAINT "roster_scores_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToRoster" ADD CONSTRAINT "_CategoryToRoster_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToRoster" ADD CONSTRAINT "_CategoryToRoster_B_fkey" FOREIGN KEY ("B") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChiefGuestToRoster" ADD CONSTRAINT "_ChiefGuestToRoster_A_fkey" FOREIGN KEY ("A") REFERENCES "chief_guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChiefGuestToRoster" ADD CONSTRAINT "_ChiefGuestToRoster_B_fkey" FOREIGN KEY ("B") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
