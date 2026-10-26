/**
 * Response shapes of /api/mobile/v1/** — the single definition both the
 * server routes and the Expo app (`mobile/`, via `import type`) compile
 * against, so a change to an endpoint's shape is a type error on both sides.
 *
 * Types only: no runtime imports, nothing from Prisma. Dates travel as ISO
 * strings; money as whole rupees (number) unless noted.
 */

export type ApiErrorBody = { error: string; code: string };

export type MobileAccount = {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  /** First-login activation still pending — the app shows only that screen. */
  mustActivate: boolean;
  /** Still on a BWFCC### username — activation must choose a new one. */
  mustChooseUsername: boolean;
  /** Activation emails a 6-digit code to confirm the address (Super Admin setting). */
  activationRequiresEmailCode: boolean;
  member: MemberSummary | null;
};

export type MemberSummary = {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  designation: string | null;
  company: string;
  chapter: string;
  category: string;
  /** Public profile page on the website. */
  profileUrl: string;
};

export type LoginResponse = { token: string; account: MobileAccount };
export type AccountResponse = { account: MobileAccount };

export type MeetingSummary = {
  id: string;
  title: string;
  startsAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  venue: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  agenda: string | null;
  chiefGuest: { name: string; designation: string | null; company: string | null } | null;
};

export type ActivityStats = {
  referralsGiven: number;
  referralsReceived: number;
  businessReceivedInr: number;
  businessGivenInr: number;
  oneToOnes: number;
  powerDates: number;
  conclaves: number;
  visitors: number;
  consumers: number;
  chiefGuests: number;
  inductions: number;
};

export type DashboardResponse = {
  score: number;
  /** "October 2026" — IST calendar month the stats cover. */
  monthLabel: string;
  thisMonth: ActivityStats;
  nextMeeting: MeetingSummary | null;
  pendingProfileEdit: { submittedAt: string } | null;
  /** Phase 37 — fellow members (or you) with a birthday today. Optional: servers before Phase 37 don't send it. */
  birthdaysToday?: { id: string; name: string; isMe: boolean }[];
};

// --- Activities (Phase 33) ---

export type PickerMember = {
  id: string;
  name: string;
  company: string;
  chapterId: string;
  chapterName: string;
  categoryId: string;
  categoryName: string;
};

export type PickerMembersResponse = { members: PickerMember[] };

export type PersonRef = { name: string; company: string };

export type ReferralRow = { id: string; type: "OUTSIDE" | "SELF"; description: string | null; createdAt: string; other: PersonRef };
export type ReferralsResponse = { given: ReferralRow[]; received: ReferralRow[] };

export type ThankYouSlipRow = { id: string; amountInr: number; description: string | null; createdAt: string; other: PersonRef };
export type ThankYouSlipsResponse = {
  /** Slips this member recorded — business they received, thanking `other`. */
  given: ThankYouSlipRow[];
  /** Slips others recorded thanking this member — business this member gave. */
  received: ThankYouSlipRow[];
  totalGivenInr: number;
  totalReceivedInr: number;
  /** Referrals this member received — a new slip may link back to one. */
  linkableReferrals: { id: string; fromMemberName: string; createdAt: string }[];
};

export type OneToOneRow = { id: string; notes: string | null; metAt: string; with: PersonRef; recordedByMe: boolean };
export type OneToOnesResponse = { items: OneToOneRow[] };

export type PowerDateRow = {
  id: string;
  externalContactName: string;
  externalContactCompany: string | null;
  notes: string | null;
  metAt: string;
  participant: PersonRef;
};
export type PowerDatesResponse = { items: PowerDateRow[] };

export type ConclaveRow = {
  id: string;
  location: string | null;
  notes: string | null;
  metAt: string;
  organizer: string;
  participants: string[];
  organizedByMe: boolean;
};
export type ConclavesResponse = { items: ConclaveRow[] };

export type ConsumerRow = { id: string; name: string; company: string | null; phone: string | null; notes: string | null; metAt: string };
export type ConsumersResponse = { items: ConsumerRow[] };

export type ChiefGuestRow = { id: string; name: string; company: string | null; designation: string | null; notes: string | null; metAt: string };
export type ChiefGuestsResponse = { items: ChiefGuestRow[] };

export type RecordResponse = { ok: true; id: string };

export type ScoreRow = { type: string; label: string; count: number; pointsEach: number; subtotal: number };
export type PointsResponse = { total: number; breakdown: ScoreRow[] };

export type ReportPeriod = "week" | "6mo" | "12mo" | "overall";
export type ReportsResponse = { period: ReportPeriod; stats: ActivityStats };

export type DetailedReportTab = { key: string; label: string };
export type DetailedReportResponse = {
  tabs: DetailedReportTab[];
  tab: string;
  columns: string[];
  rows: { key: string; cells: string[] }[];
};

// --- Meetings, nearby search, profile, payments, check-in (Phase 34) ---

export type MeetingsResponse = {
  upcoming: MeetingSummary[];
  recent: Pick<MeetingSummary, "id" | "title" | "startsAt" | "status">[];
};

export type NearbyMember = {
  id: string;
  name: string;
  photoUrl: string | null;
  company: string;
  chapter: string;
  category: string;
  locality: string | null;
  phone: string | null;
  whatsapp: string | null;
  latitude: number | null;
  longitude: number | null;
  /** km, only in radius mode. */
  distanceKm: number | null;
  profileUrl: string;
};

export type NearbySearchResponse = {
  mode: "radius" | "text" | "all";
  radiusKm: number;
  radiusOptions: number[];
  total: number;
  /** Members matching the filters who have no saved location (radius mode only). */
  withoutLocation: number;
  members: NearbyMember[];
  chapters: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};

export type ProfileFieldKey =
  | "name"
  | "designation"
  | "bio"
  | "email"
  | "phone"
  | "whatsapp"
  | "website"
  | "address"
  | "services"
  | "specialisations"
  | "usp"
  | "yearsInBusiness"
  | "areasServed"
  | "certifications"
  | "majorProjects"
  | "clientele"
  | "instagramUrl"
  | "linkedinUrl"
  | "facebookUrl"
  | "youtubeUrl";

export type ProfileResponse = {
  member: MemberSummary;
  fields: Record<ProfileFieldKey, string>;
  labels: Record<ProfileFieldKey, string>;
  pendingEdit: { submittedAt: string } | null;
};

export type PaymentStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CLARIFICATION_REQUESTED";

export type PaymentRow = {
  id: string;
  type: "MEETING" | "MEMBERSHIP";
  status: PaymentStatus;
  amountInr: string;
  actualPaymentDate: string;
  /** "Oct 2026, Nov 2026" or "Membership 2026". */
  coverageLabel: string;
  meetingTitle: string | null;
  reviewRemarks: string | null;
  createdAt: string;
};

export type PayeeDetails = {
  qrCodeUrl: string | null;
  upiId: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
};

export type PaymentsResponse = {
  payments: PaymentRow[];
  thisMonth: { label: string; status: "APPROVED" | "PENDING" | null };
  /** Last consecutive approved month starting from this month, e.g. "Dec 2026". */
  paidThrough: string | null;
  /** First month not yet paid or awaiting approval — where a new meeting payment should start. */
  nextUnpaidMonth: { month: number; year: number };
  membership: { year: number; status: "APPROVED" | "PENDING" | null };
  membershipYears: number[];
  defaultMembershipYear: number;
  fees: { monthlyMeeting: string | null; annualMembership: string | null };
  meetingPayee: PayeeDetails;
  membershipPayee: PayeeDetails;
  uploadsEnabled: boolean;
  /** Phase 40 — month-by-month meeting-fee status (tick = approved). Optional: older servers don't send it. */
  monthGrid?: PaymentMonthTile[];
  /** Phase 40 — numbers for pre-filling the amount: monthly fee before GST, GST %, annual membership total incl. GST. */
  feeQuote?: { monthlyMeetingInr: number | null; gstPercent: number; membershipTotalInr: number | null };
};

export type PaymentMonthTile = {
  month: number;
  year: number;
  /** "Oct 2026" */
  label: string;
  /** NO_RECORD = an earlier month with nothing on record (not necessarily unpaid — older payments weren't imported). */
  status: "PAID" | "PENDING" | "DUE" | "NO_RECORD" | "UPCOMING";
  current: boolean;
};

export type UploadTicket = { uploadUrl: string; publicUrl: string; maxBytes: number };

export type CheckinPreviewResponse = {
  meeting: { id: string; title: string; chapter: string; startsAt: string };
  member: { name: string; category: string; chapter: string };
  open: boolean;
  alreadyCheckedIn: boolean;
  /** The meeting's month is already paid (or awaiting approval). */
  monthCoverage: "APPROVED" | "PENDING" | null;
  monthLabel: string;
};

// --- Socials / birthdays (Phase 37) ---

export type BirthdayRow = {
  id: string;
  name: string;
  photoUrl: string | null;
  company: string;
  category: string;
  chapter: string;
  day: number;
  month: number;
  /** "14 March" — never the year. */
  label: string;
  /** 0 = today. */
  daysAway: number;
  isMe: boolean;
  /** wa.me link with a ready-typed wish; null for yourself or with no usable number. */
  wishUrl: string | null;
};

export type BirthdayValue = { day: number; month: number; year: number | null };

export type SocialsResponse = {
  today: BirthdayRow[];
  /** The next `upcomingDays` days, soonest first. */
  upcoming: BirthdayRow[];
  upcomingDays: number;
  byMonth: { month: number; name: string; people: BirthdayRow[] }[];
  myBirthday: BirthdayValue | null;
};

/** POST /profile/birthday — all three null clears it. */
export type BirthdayUpdateRequest = { day: number | null; month: number | null; year: number | null };
export type BirthdayUpdateResponse = { ok: true; myBirthday: BirthdayValue | null };
