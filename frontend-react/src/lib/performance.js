/**
 * Production performance for one batch, judged by what its bird type is
 * raised for (see BIRD_PURPOSES in ./batch.js) rather than one flat
 * good/bad label. Because it keys off purpose, a bird type the farmer adds
 * themselves is judged sensibly with no code change:
 *
 *   eggs  → laying rate (hen-day production), eggs per bird
 *   meat  → profit and profit margin once sold (completing the batch records
 *           sales); before that, survival and feed conversion so far
 *   dual  → egg output while laying, plus profit once sold
 *   other → survival and cost per bird
 *
 * Thresholds are common Nigerian flock benchmarks — a guide for comparing
 * batches, not a verdict. Every result says what it was based on.
 */

import { EGGS_PER_CRATE } from './batch';

/** @typedef {'excellent' | 'good' | 'fair' | 'poor' | 'none'} Rating */

export const RATING_STYLES = {
  excellent: { label: 'Excellent', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', bar: 'bg-emerald-600' },
  good: { label: 'Good', pill: 'bg-[#EAF5EF] text-[#0D472B] border-[#CFE8D9]', bar: 'bg-[#0D5C3A]' },
  fair: { label: 'Fair', pill: 'bg-amber-50 text-amber-800 border-amber-200', bar: 'bg-amber-500' },
  poor: { label: 'Needs attention', pill: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' },
  none: { label: 'Not enough data', pill: 'bg-stone-50 text-stone-500 border-stone-200', bar: 'bg-stone-300' },
};

const naira = (n) => `${n < 0 ? '−' : ''}₦${Math.round(Math.abs(n)).toLocaleString()}`;
const pct = (n) => `${Math.round(n * 10) / 10}%`;

function bucket(value, [excellent, good, fair]) {
  if (value == null || Number.isNaN(value)) return 'none';
  if (value >= excellent) return 'excellent';
  if (value >= good) return 'good';
  if (value >= fair) return 'fair';
  return 'poor';
}

/** Lower-is-better version (feed conversion). */
function bucketLow(value, [excellent, good, fair]) {
  if (value == null || Number.isNaN(value)) return 'none';
  if (value <= excellent) return 'excellent';
  if (value <= good) return 'good';
  if (value <= fair) return 'fair';
  return 'poor';
}

function eggAssessment({ eggLogs, currentBirds, endDate, ageWeeks }) {
  const eggsOf = (e) => (Number(e.crates) || 0) * EGGS_PER_CRATE + (Number(e.looseEggs) || 0);
  const dated = eggLogs.filter((e) => e.date && eggsOf(e) > 0).sort((a, b) => a.date.localeCompare(b.date));
  if (dated.length === 0) {
    return {
      rating: 'none',
      headline: ageWeeks != null && ageWeeks < 18 ? 'Not laying yet' : 'No eggs recorded yet',
      detail: ageWeeks != null && ageWeeks < 18
        ? `At ${ageWeeks} weeks the birds are too young to lay; most start around 18–20 weeks.`
        : 'Log daily egg collections and the laying rate will show here.',
      metrics: [],
    };
  }
  const total = dated.reduce((s, e) => s + eggsOf(e), 0);
  const first = new Date(`${dated[0].date}T00:00:00`);
  const days = Math.max(1, Math.round((endDate - first) / 86400000) + 1);
  const perDay = total / days;
  // Hen-day production: eggs per bird per day, as a percentage.
  const layingRate = currentBirds > 0 ? (perDay / currentBirds) * 100 : null;
  const rating = bucket(layingRate, [80, 65, 50]);
  return {
    rating,
    headline: layingRate == null ? 'Egg output' : `Laying at ${pct(layingRate)}`,
    detail: 'Laying rate is eggs per bird per day since laying began. Well-run layer flocks hold 80% or more at peak; under 50% needs looking into.',
    metrics: [
      { label: 'Laying rate', value: layingRate == null ? '-' : pct(layingRate) },
      { label: 'Eggs per day', value: Math.round(perDay).toLocaleString() },
      { label: 'Eggs per bird', value: currentBirds ? (total / currentBirds).toFixed(1) : '-' },
      { label: 'Total eggs', value: total.toLocaleString() },
    ],
  };
}

function profitAssessment({ batch, costs }) {
  const revenue = Number(batch.salesRevenueNaira);
  if (!(revenue > 0)) return null;
  const totalCost = costs.birds + costs.feed + costs.vaccines + costs.supplements;
  const profit = revenue - totalCost;
  const margin = (profit / revenue) * 100;
  const sold = Number(batch.birdsSold) || 0;
  const missingBirdCost = !(costs.birds > 0);
  return {
    rating: bucket(margin, [25, 10, 0]),
    headline: profit >= 0 ? `${naira(profit)} profit` : `${naira(profit)} loss`,
    detail:
      'Profit is sales minus the cost of the birds, feed, vaccines and vitamins recorded for this batch. A margin above 25% is excellent; below zero is a loss.' +
      (missingBirdCost ? ' The cost of the birds was not recorded, so profit is overstated.' : ''),
    metrics: [
      { label: 'Sales', value: naira(revenue) },
      { label: 'Total costs', value: naira(totalCost) },
      { label: 'Profit margin', value: pct(margin) },
      { label: 'Profit per bird sold', value: sold ? naira(profit / sold) : '-' },
    ],
  };
}

function growthAssessment({ survival, fcr, costPerBird, closed }) {
  const survivalRating = bucket(survival, [97, 93, 88]);
  const fcrRating = bucketLow(fcr, [1.7, 1.9, 2.2]);
  const order = ['poor', 'fair', 'good', 'excellent'];
  // The weaker of the two signals, when both exist.
  const rating = fcrRating === 'none'
    ? survivalRating
    : order[Math.min(order.indexOf(survivalRating), order.indexOf(fcrRating))] || survivalRating;
  return {
    rating,
    headline: closed ? 'Sales not recorded' : rating === 'poor' ? 'Needs attention so far' : 'On track so far',
    detail: closed
      ? 'Add the sales from this batch to see its profit. Until then it is judged on survival and feed conversion.'
      : 'Profit is worked out when you complete the batch and record its sales. Until then it is judged on survival (97%+ is excellent) and feed conversion (1.7 or lower is excellent for broilers).',
    metrics: [
      { label: 'Survival', value: survival == null ? '-' : pct(survival) },
      { label: 'Feed conversion', value: fcr != null ? `${fcr} : 1` : '-' },
      { label: 'Cost per bird so far', value: costPerBird == null ? '-' : naira(costPerBird) },
    ],
  };
}

/**
 * @param {Object} input
 * @param {'eggs'|'meat'|'dual'|'other'} input.purpose
 * @param {Object} input.batch
 * @param {Array} input.eggLogs
 * @param {number} input.currentBirds
 * @param {number|null} input.fcr
 * @param {number|null} input.ageWeeks
 * @param {{birds:number, feed:number, vaccines:number, supplements:number}} input.costs
 * @returns {{ rating: Rating, headline: string, detail: string, basis: string, metrics: {label:string, value:string}[], extra?: object }}
 */
export function assessPerformance({ purpose, batch, eggLogs = [], currentBirds, fcr, ageWeeks, costs }) {
  const closed = batch.status === 'closed';
  const endDate = closed && batch.closedAt ? new Date(batch.closedAt) : new Date();
  const placed = Number(batch.birdCount) || 0;
  const survival = placed ? (currentBirds / placed) * 100 : null;
  const spent = costs.birds + costs.feed + costs.vaccines + costs.supplements;
  const costPerBird = currentBirds > 0 && spent > 0 ? spent / currentBirds : null;

  if (purpose === 'eggs') {
    return { ...eggAssessment({ eggLogs, currentBirds, endDate, ageWeeks }), basis: 'Egg output' };
  }

  if (purpose === 'meat') {
    const profit = profitAssessment({ batch, costs });
    if (profit) return { ...profit, basis: 'Sales and profit' };
    return { ...growthAssessment({ survival, fcr, costPerBird, closed }), basis: 'Survival and growth (until sold)' };
  }

  if (purpose === 'dual') {
    const eggs = eggAssessment({ eggLogs, currentBirds, endDate, ageWeeks });
    const profit = profitAssessment({ batch, costs });
    if (profit) {
      return {
        ...profit,
        metrics: [...profit.metrics, ...eggs.metrics.slice(0, 2)],
        basis: 'Sales and profit, plus egg output',
      };
    }
    if (eggs.rating !== 'none') return { ...eggs, basis: 'Egg output (profit once sold)' };
    return { ...growthAssessment({ survival, fcr, costPerBird, closed }), basis: 'Survival and growth (until laying or sold)' };
  }

  // 'other': breeding, show, pets, growing on — no product to measure, so
  // the flock's health and what it costs to keep.
  return {
    rating: bucket(survival, [97, 93, 88]),
    headline: survival == null ? 'Not enough data' : `${pct(survival)} of birds alive`,
    detail: 'Judged on how many birds survive (97%+ is excellent) and what each one has cost to raise.',
    basis: 'Survival and cost per bird',
    metrics: [
      { label: 'Survival', value: survival == null ? '-' : pct(survival) },
      { label: 'Birds alive', value: currentBirds.toLocaleString() },
      { label: 'Cost per bird', value: costPerBird == null ? '-' : naira(costPerBird) },
    ],
  };
}
