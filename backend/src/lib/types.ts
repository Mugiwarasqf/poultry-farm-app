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
  createdAt: string;
}

export type BatchStatus = "active" | "closed";
export type BatchType = "layer" | "broiler" | "other";

export interface Batch {
  farmId: string;
  batchId: string;
  name: string;
  type: BatchType;
  startDate: string;
  birdCount: number;
  status: BatchStatus;
  createdAt: string;
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
  amountKg: number;
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
  createdAt: string;
}

export type VaccinationScheduleStatus = "upcoming" | "done" | "missed";

export interface VaccinationSchedule {
  batchId: string;
  scheduleId: string;
  vaccineName: string;
  dueDate: string;
  status: VaccinationScheduleStatus;
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
