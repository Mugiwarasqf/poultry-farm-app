// Mirrors the data model in docs/10-build-plan.md §2. Two fields below
// (VaccinationRecord.costNaira, EggLog.revenueNaira) aren't in that doc's
// entity list explicitly, but the doc's summary section says feed and
// vaccination costs "derive from FeedLog/VaccinationRecord rather than
// being re-entered" — that only works if the cost/revenue actually lives
// on those records, so they're added here. Flagging as an assumption:
// egg revenue in particular needs a real price-per-crate decision, not
// made yet anywhere in the docs.

export interface Farm {
  farmId: string;
  ownerEmail: string;
  name: string;
  /** The person, not the farm — frontend-react's onboarding/account settings collect this separately from `name`. */
  farmerName?: string;
  location?: string;
  phone?: string;
  /** Main bird type, from onboarding / Farm Details. */
  birdType?: string;
  onboarded?: boolean;
  onboardedAt?: string;
  /** The farm's pens / houses. A batch points at one through Batch.penId. */
  pens?: Pen[];
  /**
   * Bird types the farmer added beyond the built-in list (layer, broiler,
   * turkey…, defined in frontend-react/src/lib/birdTypes.js). `purpose` is
   * what lets the app track performance sensibly for a type it has never
   * seen: eggs → laying rate, meat → sales and profit, dual → both,
   * other → survival and cost per bird.
   */
  birdTypes?: CustomBirdType[];
  createdAt: string;
  /**
   * Set when SES reports a permanent bounce or complaint for ownerEmail
   * (backend/src/handlers/sesEvents/index.ts) — surfaced in the app as a
   * "we couldn't reach your email" banner so a mistyped address at signup
   * doesn't become a silent, permanent dead end (notifications and
   * password-reset both depend on this address actually working).
   */
  emailBounced?: boolean;
  emailBouncedAt?: string;
  /** Preferences controlling which in-app alerts and daily reminder emails are active. */
  notificationPrefs?: NotificationPrefs;
}

export interface NotificationPrefs {
  emailAlerts?: boolean;
  vaccinationReminders?: boolean;
  loggingNudges?: boolean;
  feedAlerts?: boolean;
  medicationAlerts?: boolean;
  activityLogs?: boolean;
}

export interface Pen {
  /** Stable id, so renaming a pen doesn't detach the batches in it. */
  id: string;
  name: string;
  /** Birds it holds — optional, used to show how full a pen is. */
  capacity?: number;
}

export type BirdPurpose = "eggs" | "meat" | "dual" | "other";

export interface CustomBirdType {
  /** Slug of the label, e.g. "pigeon"; this is what Batch.type stores. */
  id: string;
  label: string;
  purpose: BirdPurpose;
}

export type BatchStatus = "active" | "closed";
/**
 * A built-in type id ("layer", "broiler", "turkey", …) or the id of one of
 * the farm's custom types. Older batches may carry "chick" or "other".
 */
export type BatchType = string;

export interface Batch {
  farmId: string;
  batchId: string;
  name: string;
  type: BatchType;
  startDate: string;
  birdCount: number;
  breed?: string;
  /** Pen / house name as text — kept alongside penId for older batches and display. */
  housing?: string;
  /** Pen.id on the farm this batch is housed in. */
  penId?: string;
  hatchery?: string;
  targetWeightKg?: number;
  initialAgeWeeks?: number;
  notes?: string;
  /** What the birds cost to buy — needed to work out profit for meat birds. */
  purchaseCostNaira?: number;
  status: BatchStatus;
  createdAt: string;
  /** Server-set the moment status flips to "closed"; cleared on reopen. */
  closedAt?: string;
  /** Recorded when the batch is completed. */
  birdsSold?: number;
  salesRevenueNaira?: number;
  completionNotes?: string;
}

export interface MortalityLog {
  batchId: string;
  entryId: string;
  date: string;
  count: number;
  note?: string;
  createdAt: string;
}

export interface FeedLog {
  batchId: string;
  entryId: string;
  date: string;
  feedType: string;
  /** Always stored so the summary can total feed; bags × bagSizeKg when bags are given. */
  amountKg: number;
  /** What the farmer entered — feed is bought and counted in bags. */
  bags?: number;
  bagSizeKg?: number;
  /** Matches the stock line (FeedPurchase) this usage came out of. */
  brand?: string;
  notes?: string;
  costNaira: number;
  createdAt: string;
}

export interface EggLog {
  batchId: string;
  entryId: string;
  date: string;
  crates: number;
  looseEggs: number;
  /** Optional — see file header note. Omitted until a price-per-crate exists. */
  revenueNaira?: number;
  createdAt: string;
}

export interface VaccinationRecord {
  batchId: string;
  entryId: string;
  vaccineName: string;
  dateAdministered: string;
  /** Optional — see file header note. */
  costNaira?: number;
  /** "water" | "eye_drop" | "injection" | "wing_web" | "spray" */
  route?: string;
  doseNumber?: string;
  birdsVaccinated?: number;
  dosesPerVial?: number;
  vialsUsed?: number;
  lotNumber?: string;
  administeredBy?: string;
  notes?: string;
  /** The schedule entry this record fulfilled, if any. */
  scheduleId?: string;
  createdAt: string;
}

// Not in docs/10-build-plan.md's original data model — added to back Feed
// Conversion Ratio (feed consumed ÷ weight gained), which frontend-react's
// LoginPage.jsx and BatchDetailPage.jsx/BatchHistoryDetail.jsx already
// advertised and had a UI slot for, but that was never wired to a real
// calculation (hardcoded to "-"). FCR itself is computed client-side in
// frontend-react/src/lib/batch.js's computeFCR, combining this with
// FeedLog — this table only stores the raw weight samples, same
// "derive, don't duplicate" principle as FeedPurchase/summary.
export interface WeightLog {
  batchId: string;
  entryId: string;
  date: string;
  averageWeightKg: number;
  /** How many birds the average was taken from — context only, not used in the FCR math. */
  sampleSize?: number;
  createdAt: string;
}

export type VaccinationScheduleStatus = "upcoming" | "done" | "missed";

export interface VaccinationSchedule {
  batchId: string;
  scheduleId: string;
  vaccineName: string;
  dueDate: string;
  status: VaccinationScheduleStatus;
  route?: string;
  doseNumber?: string;
  birdsToVaccinate?: number;
  dosesPerVial?: number;
  notes?: string;
  createdAt: string;
}

export type SickBayStatus = "open" | "closed";

/**
 * Birds moved out of a batch into isolation because they're sick. A case
 * opens with how many birds and what's wrong, and closes with how many
 * recovered (back to the flock) and how many died. Deaths are also written
 * to MortalityLog by the app, so the batch's bird count stays right.
 */
export interface SickBayCase {
  batchId: string;
  caseId: string;
  dateIsolated: string;
  birdCount: number;
  symptoms?: string[];
  suspectedCause?: string;
  treatment?: string;
  notes?: string;
  status: SickBayStatus;
  recoveredCount?: number;
  diedCount?: number;
  outcomeNotes?: string;
  /** Server-set when the case closes. */
  closedAt?: string;
  createdAt: string;
}

// Farm-level, not batch-level — feed bought into the farm's store, as
// distinct from FeedLog (feed a batch consumes). Not in docs/10-build-plan.md's
// original data model; added because frontend-react's api/feedStock.js and
// lib/feeds.js already ship a working stock-on-hand calculation
// (purchases in, batch FeedLog usage out) that just needs this table to
// stop 404ing — see backend/src/handlers/feedStock/index.ts. This is the
// "feed received vs. consumed vs. balance" pattern flagged from the real
// farm-record sample: consumed already existed as FeedLog, this table is
// the missing "received" side, and balance stays derived client-side
// rather than stored.
export interface FeedPurchase {
  farmId: string;
  entryId: string;
  date: string;
  feedType: string;
  bags: number;
  bagSizeKg: number;
  brand?: string;
  pricePerBagNaira?: number;
  supplier?: string;
  bestBefore?: string;
  notes?: string;
  createdAt: string;
}

export type TrialStatus = "trial" | "converted" | "expired";

export interface User {
  userId: string;
  email: string;
  farmId: string;
  trialStatus: TrialStatus;
  trialStartedAt: string;
}
