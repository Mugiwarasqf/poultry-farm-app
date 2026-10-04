// Shared batch presentation constants + small formatters.
//
// These used to live inline in DashboardPage; History needs the same bird
// imagery and type-pill colours, and having two copies means the next time
// one of the photos is swapped the two pages silently drift apart.

/**
 * What a bird type is raised for. This drives two things: whether egg
 * logging is offered, and how production performance is judged
 * (lib/performance.js) — so a type the farmer adds themselves gets sensible
 * tracking without any code change.
 */
export const BIRD_PURPOSES = [
  { value: 'eggs', label: 'Eggs', description: 'Kept for egg production' },
  { value: 'meat', label: 'Meat', description: 'Raised to be sold for meat' },
  { value: 'dual', label: 'Eggs and meat', description: 'Lays eggs and is sold for meat' },
  { value: 'other', label: 'Other', description: 'Breeding, show, pets or growing on' },
];

/**
 * Built-in bird types. The farm can add its own on top (Settings → Farm
 * Details); those are registered below with setCustomBirdTypes.
 */
export const BIRD_TYPES = [
  { value: 'layer', label: 'Layer', purpose: 'eggs' },
  { value: 'broiler', label: 'Broiler', purpose: 'meat' },
  { value: 'cockerel', label: 'Cockerel', purpose: 'meat' },
  { value: 'noiler', label: 'Noiler', purpose: 'dual' },
  { value: 'turkey', label: 'Turkey', purpose: 'meat' },
  { value: 'duck', label: 'Duck', purpose: 'meat' },
  { value: 'guinea_fowl', label: 'Guinea Fowl', purpose: 'meat' },
  { value: 'quail', label: 'Quail', purpose: 'eggs' },
];

// "chick" was offered before the list above existed. Batches created with it
// still need a readable label and a filter entry, but it is no longer offered
// on the create form.
const LEGACY_TYPES = [{ value: 'chick', label: 'Chick', purpose: 'other' }];

// The farm's own bird types ({ id, label, purpose }), set by AuthContext
// whenever the farm profile loads or changes. Kept here so every helper
// below understands custom types without each caller passing them in.
let customBirdTypes = [];

export function setCustomBirdTypes(list) {
  customBirdTypes = Array.isArray(list)
    ? list.map((t) => ({ value: t.id, label: t.label, purpose: t.purpose, custom: true }))
    : [];
}

/** Every type a batch can be created with: built-in first, then the farm's own. */
export function allBirdTypes() {
  return [...BIRD_TYPES, ...customBirdTypes.filter((c) => !BIRD_TYPES.some((b) => b.value === c.value))];
}

function findType(type) {
  const key = (type || '').toLowerCase();
  return [...allBirdTypes(), ...LEGACY_TYPES].find((t) => t.value === key) || null;
}

/** "guinea_fowl" → "Guinea Fowl"; unknown ids are made readable rather than shown raw. */
export function birdTypeLabel(type) {
  const match = findType(type);
  if (match) return match.label;
  if (!type) return 'Other';
  return String(type).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** 'eggs' | 'meat' | 'dual' | 'other' */
export function birdPurpose(type) {
  return findType(type)?.purpose || 'other';
}

/** Egg logging is offered for anything kept (at least partly) for eggs. */
export function laysEggs(type) {
  const purpose = birdPurpose(type);
  return purpose === 'eggs' || purpose === 'dual';
}

/** Turns a new type's name into its id: "Pigeon (racing)" → "pigeon_racing". */
export function birdTypeId(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/** Filter options for list pages: "All Types" + every type, custom and legacy included. */
export function typeFilterOptions() {
  return [
    { value: 'all', label: 'All Types' },
    ...allBirdTypes().map(({ value, label }) => ({ value, label })),
    ...LEGACY_TYPES.map(({ value, label }) => ({ value, label })),
  ];
}

/** @deprecated use typeFilterOptions(), which includes the farm's own types. */
export const TYPE_FILTER_OPTIONS = typeFilterOptions();

// Real bird images from public/birds/. Types without their own photo (turkey,
// duck, etc.) fall back to `default` until one is added.
export const BATCH_IMAGES = {
  layer: '/birds/jaclou-dl-hens-3420126_1920.jpg',
  broiler: '/birds/browlers.jpg',
  chick: '/birds/others.jpg',
  default: '/birds/layers.jpg',
};

// A crate is 30 eggs — used to turn logged crates into a raw egg count.
export const EGGS_PER_CRATE = 30;

export function eggCount(entry) {
  return (Number(entry?.crates) || 0) * EGGS_PER_CRATE + (Number(entry?.looseEggs) || 0);
}

/** 1,234 eggs → "41 crates, 4 eggs". */
export function formatCrates(totalEggs) {
  const crates = Math.floor(totalEggs / EGGS_PER_CRATE);
  const loose = totalEggs % EGGS_PER_CRATE;
  const parts = [`${crates.toLocaleString()} crate${crates === 1 ? '' : 's'}`];
  if (loose) parts.push(`${loose} egg${loose === 1 ? '' : 's'}`);
  return parts.join(', ');
}

/**
 * Feed is bought and counted in bags in Nigeria — every major brand (Chikun,
 * Top Feeds, Hybrid, Vital) sells 25kg bags — so the forms take bags, not kg.
 * Each entry still stores amountKg (bags × bag size) because the backend and
 * the summary endpoint are built on it, plus `bags` and `bagSizeKg` so the
 * farmer's own number is shown back exactly as they entered it.
 */
export const FEED_BAG_KG = 25;
export const FEED_BAG_SIZES = [25, 50, 15];

/** Bags in a feed entry. Older entries only have amountKg; assume 25kg bags. */
export function feedBags(entry) {
  if (entry?.bags != null) return Number(entry.bags) || 0;
  return (Number(entry?.amountKg) || 0) / (Number(entry?.bagSizeKg) || FEED_BAG_KG);
}

/** 1 → "1 bag", 2.5 → "2.5 bags", 0.333 → "0.33 bags". */
export function formatBags(bags) {
  const rounded = Math.round(bags * 100) / 100;
  return `${rounded.toLocaleString()} bag${rounded === 1 ? '' : 's'}`;
}

export const TYPE_PILL_STYLES = {
  layer: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  chick: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]',
  broiler: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
  cockerel: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  noiler: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
  turkey: 'bg-[#EAF5EF] text-[#0D5C3A] border-[#CFE8D9]',
  duck: 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]',
  guinea_fowl: 'bg-[#E7E5E4] text-[#44403C] border-[#D6D3D1]',
  quail: 'bg-[#FCE7F3] text-[#BE185D] border-[#FBCFE8]',
};

// Pill sizing lives here so every screen stays in step. The type pill
// (Layer / Broiler / Chick) is the smallest label on a card; the status pill
// sits one step above it so "Completed" still reads as the headline state.
const TYPE_PILL_SIZE = 'px-2 py-0.5 rounded-full text-[6px] font-bold border capitalize';
const STATUS_PILL_SIZE = 'px-2.5 py-0.2 rounded-full text-[8px] font-semibold border';

export function typePillClass(type) {
  const colors = TYPE_PILL_STYLES[(type || '').toLowerCase()] || 'bg-stone-100 text-stone-700 border-stone-200';
  return `${TYPE_PILL_SIZE} ${colors}`;
}

export const COMPLETED_PILL_CLASS = `${STATUS_PILL_SIZE} bg-emerald-50 text-emerald-700 border-emerald-200`;

export function batchImage(batch) {
  if (batch?.imageUrl) return batch.imageUrl;
  const type = (batch?.type || '').toLowerCase();
  return BATCH_IMAGES[type] || BATCH_IMAGES.default;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Whole days a batch ran. Needs closedAt, which is only set on batches
 * closed after that field was added server-side — older closed batches
 * return null rather than a made-up number.
 */
export function daysActive(startDate, closedAt) {
  if (!startDate || !closedAt) return null;
  const start = new Date(startDate);
  const end = new Date(closedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

/**
 * How old the birds in a batch are right now, as a readable string.
 *
 * Counts from the placement date and keeps climbing week by week as the birds
 * grow, so a batch's age is always current without anyone updating it.
 * `initialAgeWeeks` is added on top, because a flock can be recorded after it
 * was already placed — a batch entered at six weeks old reads as six weeks on
 * day one, not as a day old.
 *
 * A closed batch stops ageing at its close date. Without that it would keep
 * counting forever, and a flock finished last year would eventually show an
 * age of many months that no bird ever reached.
 */
export function batchAge(batch) {
  if (!batch?.startDate) {
    return batch?.initialAgeWeeks ? `${batch.initialAgeWeeks} weeks` : 'Active';
  }

  const start = new Date(batch.startDate);
  if (Number.isNaN(start.getTime())) return '—';

  const end = batch.closedAt ? new Date(batch.closedAt) : new Date();
  const elapsedDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  const totalDays = elapsedDays + Number(batch.initialAgeWeeks || 0) * 7;
  const weeks = Math.floor(totalDays / 7);

  if (weeks < 1) {
    const days = totalDays || 1;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

/** "4%" / "0.4%" — avoids a pointless trailing ".0". */
export function formatPercent(part, whole) {
  if (!whole) return null;
  const pct = (part / whole) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/**
 * Feed Conversion Ratio: kg of feed consumed per kg of live weight gained.
 * Needs at least two weight samples — an earliest and a most recent — to
 * have a "gain" to divide by; with zero or one sample there's nothing to
 * compute yet, so this returns null rather than a misleading number.
 *
 * A deliberate simplification, not the precise formula a feed-mill
 * nutritionist would use: weight gain is (latest avg - first avg) × the
 * batch's *current* live bird count, which doesn't account for birds that
 * died partway through (their own gain up to death isn't separately
 * counted, only the feed they ate is, via the unfiltered feed total).
 * Good enough for a farmer comparing batches against each other; not
 * precise enough for a research paper.
 */
export function computeFCR(feedLogs = [], weightLogs = [], currentBirdCount = 0) {
  if (weightLogs.length < 2 || !currentBirdCount) return null;

  const sorted = [...weightLogs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const gainPerBirdKg = Number(last.averageWeightKg) - Number(first.averageWeightKg);
  if (!(gainPerBirdKg > 0)) return null;

  const totalWeightGainKg = gainPerBirdKg * currentBirdCount;
  const totalFeedKg = feedLogs.reduce((sum, f) => sum + (Number(f.amountKg) || 0), 0);
  if (!(totalFeedKg > 0)) return null;

  return Math.round((totalFeedKg / totalWeightGainKg) * 100) / 100;
}
