import { birdTypeLabel, eggCount, feedBags, formatBags, formatDate, FEED_BAG_KG } from './batch';
import { ROUTES } from './vaccines';
import { describeDose, findSupplementType } from './supplements';
import { penForBatch } from './pens';

/**
 * Farm-wide record tables for Export, built from collectFarmData().
 * Columns mirror the per-batch PDF reports on the batch page. Money headers
 * say "NGN" because the PDF fonts have no ₦ glyph.
 */

export const EXPORT_TYPES = [
  { id: 'batches', label: 'Batches' },
  { id: 'mortality', label: 'Mortality' },
  { id: 'feed', label: 'Feed' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'vaccinations', label: 'Vaccinations' },
  { id: 'supplements', label: 'Vitamins' },
  { id: 'weight', label: 'Weight' },
];

const byDate = (a, b) => (a.date || '').localeCompare(b.date || '');
const num = (n) => (Number(n) || 0).toLocaleString();

const BUILDERS = {
  batches: (data) => ({
    headers: ['Batch', 'Bird type', 'Status', 'Started', 'Closed', 'Birds placed', 'Birds now', 'Pen', 'Breed'],
    rows: data.batches.map((b) => [
      b.name,
      birdTypeLabel(b.type),
      (b.status || 'active') === 'closed' ? 'Completed' : 'Active',
      formatDate(b.startDate),
      b.closedAt ? formatDate(b.closedAt) : '-',
      num(b.birdCount),
      num(b.currentBirds ?? b.birdCount),
      penForBatch(b, data.pens)?.name || b.housing || '-',
      b.breed || '-',
    ]),
  }),
  mortality: (data) => ({
    headers: ['Date', 'Batch', 'Birds died', 'Cause'],
    rows: [...data.mortality].sort(byDate).map((m) => [formatDate(m.date), m.batchName, m.count || 0, m.note || '']),
  }),
  feed: (data) => ({
    headers: ['Date', 'Batch', 'Feed type', 'Bags', 'Bag size', 'Cost (NGN)'],
    rows: [...data.feed].sort(byDate).map((e) => [
      formatDate(e.date),
      e.batchName,
      e.feedType || '',
      formatBags(feedBags(e)),
      `${Number(e.bagSizeKg) || FEED_BAG_KG}kg`,
      num(e.costNaira),
    ]),
  }),
  eggs: (data) => ({
    headers: ['Date', 'Batch', 'Crates', 'Loose eggs', 'Total eggs'],
    rows: [...data.eggs].sort(byDate).map((e) => [
      formatDate(e.date),
      e.batchName,
      Number(e.crates) || 0,
      Number(e.looseEggs) || 0,
      num(eggCount(e)),
    ]),
  }),
  vaccinations: (data) => {
    const today = new Date().toISOString().slice(0, 10);
    const due = data.schedule.filter((s) => s.status !== 'done' && s.dueDate);
    return {
      headers: ['Date', 'Batch', 'Vaccine', 'Dose', 'Method', 'Birds', 'Given by', 'Status'],
      rows: [
        ...[...data.vaccinations].sort(byDate).map((v) => [
          formatDate(v.date),
          v.batchName,
          v.vaccineName || '',
          v.doseNumber || '-',
          ROUTES[v.route]?.label || '-',
          v.birds ? num(v.birds) : '-',
          v.administeredBy || '-',
          'Given',
        ]),
        ...due.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map((s) => [
          formatDate(s.dueDate),
          s.batchName,
          s.vaccineName || '',
          s.doseNumber || '-',
          ROUTES[s.route]?.label || '-',
          s.birdsToVaccinate ? num(s.birdsToVaccinate) : '-',
          '-',
          s.dueDate < today || s.status === 'missed' ? 'Overdue' : 'Due',
        ]),
      ],
    };
  },
  supplements: (data) => ({
    headers: ['Started', 'Batch', 'Type', 'Product', 'Dose', 'Reason', 'Withdrawal'],
    rows: [...data.supplements].sort(byDate).map((m) => [
      formatDate(m.date),
      m.batchName || '-',
      findSupplementType(m.type)?.label || 'Supplement',
      m.product || '',
      describeDose(m) || '-',
      m.reason || m.notes || '-',
      m.withdrawalDays ? `${m.withdrawalDays} days` : '-',
    ]),
  }),
  weight: (data) => ({
    headers: ['Date', 'Batch', 'Average weight (kg)', 'Birds weighed'],
    rows: [...data.weight].sort(byDate).map((w) => [
      formatDate(w.date),
      w.batchName,
      Math.round(Number(w.averageWeightKg) * 1000) / 1000,
      w.sampleSize ? num(w.sampleSize) : '-',
    ]),
  }),
};

/** One `{ id, title, headers, rows }` table per requested type. */
export function buildExportSections(data, typeIds) {
  return EXPORT_TYPES.filter((t) => typeIds.includes(t.id)).map((t) => ({
    id: t.id,
    title: t.label,
    ...BUILDERS[t.id](data),
  }));
}

/** CSV text with every cell quoted; the BOM makes Excel read ₦ and accents correctly. */
export function toCsv(headers, rows) {
  const quote = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  return '﻿' + [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
}
