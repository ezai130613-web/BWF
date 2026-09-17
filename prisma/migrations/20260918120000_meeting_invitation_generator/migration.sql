-- CreateTable
CREATE TABLE "meeting_invitations" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "headingLine1" TEXT NOT NULL DEFAULT 'BUILDERS WORLD FORUM',
    "headingLine2" TEXT NOT NULL DEFAULT 'YOU ARE INVITED',
    "guestName" TEXT,
    "guestDesignation" TEXT,
    "guestOrganisation" TEXT,
    "guestPhotoUrl" TEXT,
    "whyAttendText" TEXT NOT NULL DEFAULT 'Connect with entrepreneurs, build meaningful business relationships, exchange referrals and discover new opportunities through the Builders World Forum.',
    "dateLabel" TEXT,
    "timeLabel" TEXT,
    "venueLabel" TEXT,
    "addressLabel" TEXT,
    "feeLabel" TEXT,
    "isComplimentary" BOOLEAN NOT NULL DEFAULT false,
    "includeQr" BOOLEAN NOT NULL DEFAULT true,
    "meetingSnapshotAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_invitations_meetingId_key" ON "meeting_invitations"("meetingId");

-- AddForeignKey
ALTER TABLE "meeting_invitations" ADD CONSTRAINT "meeting_invitations_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
