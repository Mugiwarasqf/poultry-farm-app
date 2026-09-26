// Shared batch presentation constants + small formatters.
//
// These used to live inline in DashboardPage; History needs the same bird
// imagery and type-pill colours, and having two copies means the next time
// one of the photos is swapped the two pages silently drift apart.

// Real bird images from public/birds/
export const BATCH_IMAGES = {
  layer: '/birds/jaclou-dl-hens-3420126_1920.jpg',
  broiler: '/birds/browlers.jpg',
  chick: '/birds/others.jpg',
  default: '/birds/layers.jpg',
};

// A crate is 30 eggs — used to turn logged crates into a raw egg count.
export const EGGS_PER_CRATE = 30;

export const TYPE_PILL_STYLES = {
  layer: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  chick: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]',
  broiler: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
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
