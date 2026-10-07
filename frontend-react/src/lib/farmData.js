import { getLogs } from '../api/logs';
import { getSchedule } from '../api/schedule';
import { getVaccinationRecords } from '../api/vaccinations';
import { getSickBayCases } from '../api/sickBay';
import { getFeedPurchases } from '../api/feedStock';
import { loadSupplements } from './supplements';

/**
 * Two batches' worth of requests at a time. Firing every batch's requests at
 * once tripped Lambda concurrency limits and came back as 503s.
 */
export const BATCHES_PER_GROUP = 2;

/** Runs `fn` over `items` `size` at a time; results keep the original order. */
export async function inGroups(items, size, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

export async function safe(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

const LOG_KINDS = ['mortality', 'feed', 'eggs', 'weight'];

/**
 * Every record the farm has, for the backup file and exports. Covers active
 * and completed batches alike.
 *
 * A request that fails becomes an empty list rather than failing the whole
 * download; what was missed is listed in `warnings` so the farmer is told.
 *
 * @param {{ farm: object|null, batches: object[] }} input
 */
export async function collectFarmData({ farm, batches }) {
  const warnings = [];
  const tag = (b) => (row) => ({ ...row, batchId: row.batchId || b.batchId, batchName: b.name });
  const fetchList = async (label, b, promise) => {
    const list = await safe(promise, null);
    if (list === null) {
      warnings.push(`${label} for ${b.name}`);
      return [];
    }
    return list.map(tag(b));
  };

  const perBatch = await inGroups(batches, BATCHES_PER_GROUP, async (b) => {
    const [mortality, feed, eggs, weight, vaccinations, schedule, sickBay] = await Promise.all([
      ...LOG_KINDS.map((kind) => fetchList(kind, b, getLogs(b.batchId, kind).then((r) => r.logs || []))),
      fetchList('vaccinations', b, getVaccinationRecords(b.batchId).then((r) => r.logs || [])),
      fetchList('vaccination schedule', b, getSchedule(b.batchId).then((r) => r.schedule || [])),
      fetchList('sick bay', b, getSickBayCases(b.batchId)),
    ]);
    return { mortality, feed, eggs, weight, vaccinations, schedule, sickBay };
  });

  const merge = (key) => perBatch.flatMap((p) => p[key]);
  const feedStock = await safe(getFeedPurchases(), null);
  if (feedStock === null) warnings.push('feed store purchases');

  const batchNames = Object.fromEntries(batches.map((b) => [b.batchId, b.name]));
  const supplements = loadSupplements().map((s) => ({ ...s, batchName: batchNames[s.batchId] || '' }));

  return {
    farm: farm || null,
    pens: farm?.pens || [],
    birdTypes: farm?.birdTypes || [],
    batches,
    mortality: merge('mortality'),
    feed: merge('feed'),
    eggs: merge('eggs'),
    weight: merge('weight'),
    vaccinations: merge('vaccinations'),
    schedule: merge('schedule'),
    sickBay: merge('sickBay'),
    feedStock: feedStock || [],
    supplements,
    warnings,
  };
}

/** Saves `content` as a file through a temporary download link. */
export function saveFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Green Acres Farm" → "green-acres-farm", for filenames. */
export function fileSlug(text) {
  return (text || 'farm').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'farm';
}
