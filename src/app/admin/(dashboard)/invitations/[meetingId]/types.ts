import type { InvitationGuest } from "@/lib/invitations/poster";

export type QrTarget = "LOCATION" | "REGISTRATION";

/** The invitation's own editable fields — never written back to Meeting/ChiefGuest. */
export interface InvitationFormValues {
  eyebrow: string;
  headline: string;
  guests: InvitationGuest[];
  whyAttendText: string;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  addressLabel: string;
  websiteLabel: string;
  contactPhones: string;
  ctaText: string;
  feeLabel: string;
  feeNote: string;
  isComplimentary: boolean;
  includeQr: boolean;
  qrTarget: QrTarget;
  /** Empty = BWF's bundled photo behind the green panel. */
  backgroundPhotoUrl: string;
}

export type CatalogGuest = InvitationGuest & { id: string };

/** Read-only, always-current data derived from the live Meeting/Chapter/ChiefGuest — seeds defaults and powers "Refresh from meeting". */
export interface InvitationSourceData {
  chapterLabel: string;
  meetingTitle: string;
  meetingDateIso: string;
  defaultDateLabel: string;
  defaultTimeLabel: string;
  defaultVenueLabel: string;
  defaultAddressLabel: string;
  defaultGuests: InvitationGuest[];
  /** This chapter's (and global) Chief Guest catalog, for "Add chief guest". */
  guestCatalog: CatalogGuest[];
  checkinUrl: string | null;
  locationUrl: string;
}
