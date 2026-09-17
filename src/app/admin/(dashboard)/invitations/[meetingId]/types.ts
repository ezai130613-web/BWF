/** The invitation's own editable fields — never written back to Meeting/ChiefGuest. */
export interface InvitationFormValues {
  headingLine1: string;
  headingLine2: string;
  guestName: string;
  guestDesignation: string;
  guestOrganisation: string;
  guestPhotoUrl: string;
  whyAttendText: string;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  addressLabel: string;
  feeLabel: string;
  isComplimentary: boolean;
  includeQr: boolean;
}

/** Read-only, always-current fields derived from the live Meeting/Chapter/ChiefGuest — used both to seed defaults and to power the "Refresh from meeting" action. */
export interface InvitationSourceData {
  chapterLabel: string;
  meetingTitle: string;
  meetingDateIso: string;
  defaultDateLabel: string;
  defaultTimeLabel: string;
  defaultVenueLabel: string;
  defaultAddressLabel: string;
  defaultGuestName: string;
  defaultGuestDesignation: string;
  defaultGuestOrganisation: string;
  defaultGuestPhotoUrl: string;
  checkinUrl: string | null;
}
