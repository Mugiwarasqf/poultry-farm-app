/**
 * Production trend for one batch, shared by the dashboard's Production
 * Performance card and the batch page's production card. Judged by what the
 * bird type is raised for (lib/batch.js birdPurpose): egg layers get eggs per
 * day, meat birds get weigh-ins, everything else gets birds alive. Only what
 * was recorded is plotted; too little gives an empty state, never a filled-in
 * line, and there is no rating or verdict.
 */
import { batchAge, birdPurpose, computeFCR, eggCount } from './batch';
import { toIso } from './supplements';

export const CHART_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---- small formatters -------------------------------------------------------

export function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIso(d);
}

export function daysUntil(isoDate, today) {
  return Math.round((new Date(`${isoDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / DAY_MS);
}

export function shortDay(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Apr 24, 2025 • 8:45 AM" when the entry has a real time, else just the date. */
export function stamp(at) {
  if (!at) return '';
  const hasTime = at.length > 10;
  const d = hasTime ? new Date(at) : new Date(`${at}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return hasTime ? `${date} • ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : date;
}

export function dueWhen(days) {
  if (days === 0) return 'Due today';
  if (days === 1) return 'Next due tomorrow';
  return `Next in ${days} days`;
}

export const round1 = (n) => Math.round(n * 10) / 10;

// ---- production performance -------------------------------------------------

/**
 * What the Production Performance card shows for one batch, judged by what
 * its bird type is raised for (the same purpose lib/performance.js uses):
 * egg layers get daily eggs, meat birds get weigh-ins, everything else gets
 * birds alive. Only recorded entries are plotted; too few gives an empty
 * state, never a filled-in line.
 */
export function buildPerformance(batch, logs, weightLogs, currentBirds) {
  const purpose = birdPurpose(batch.type);
  const eggs = logs?.eggs || [];
  const showEggs = purpose === 'eggs' || (purpose === 'dual' && eggs.length > 0);

  if (showEggs) {
    const since = isoDaysAgo(CHART_DAYS - 1);
    const byDate = new Map();
    eggs.filter((e) => e.date && e.date >= since).forEach((e) => {
      byDate.set(e.date, (byDate.get(e.date) || 0) + eggCount(e));
    });
    const days = [...byDate.keys()].sort();
    const points = days.map((d) => ({ label: shortDay(d), value: byDate.get(d) }));
    if (points.length === 0) {
      return { kind: 'eggs', title: 'Egg Production', empty: `No eggs recorded in the last ${CHART_DAYS} days.` };
    }

    const avgPerLoggedDay = (from, to) => {
      const inRange = days.filter((d) => d >= from && d <= to);
      if (inRange.length === 0) return null;
      return inRange.reduce((s, d) => s + byDate.get(d), 0) / inRange.length;
    };
    const thisWeek = avgPerLoggedDay(isoDaysAgo(6), toIso(new Date()));
    const lastWeek = avgPerLoggedDay(isoDaysAgo(13), isoDaysAgo(7));
    const change = thisWeek != null && lastWeek ? round1(((thisWeek - lastWeek) / lastWeek) * 100) : null;
    const latest = points[points.length - 1];

    return {
      kind: 'eggs',
      title: 'Egg Production',
      unit: 'eggs/day',
      value: latest.value.toLocaleString(),
      suffix: '/day',
      caption: `Collected on ${latest.label}`,
      change: change == null ? null : { up: change >= 0, text: `${change >= 0 ? '+' : ''}${change}% vs previous week` },
      extras: currentBirds > 0 ? [{ label: 'Laying rate', value: `${round1((latest.value / currentBirds) * 100)}%` }] : [],
      points: points.length >= 2 ? points : null,
      thin: 'Log eggs on another day to see the trend.',
      formatTick: (v) => Math.round(v).toLocaleString(),
    };
  }

  if (purpose === 'meat' || purpose === 'dual') {
    const samples = (weightLogs || [])
      .filter((w) => w.date && Number(w.averageWeightKg) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (weightLogs == null) return { kind: 'weight', title: 'Average Weight', loading: true };
    if (samples.length === 0) {
      return { kind: 'weight', title: 'Average Weight', empty: 'No weigh-ins recorded yet. Weigh a sample of birds to see growth.' };
    }
    const latest = samples[samples.length - 1];
    const prev = samples[samples.length - 2];
    const gain = prev ? round1(Number(latest.averageWeightKg) - Number(prev.averageWeightKg)) : null;
    const fcr = computeFCR(logs?.feed || [], samples, currentBirds);
    const placed = Number(batch.birdCount) || 0;
    const extras = [];
    if (fcr != null) extras.push({ label: 'Feed conversion', value: `${fcr} : 1` });
    if (placed) extras.push({ label: 'Survival', value: `${round1((currentBirds / placed) * 100)}%` });

    return {
      kind: 'weight',
      title: 'Average Weight',
      value: round1(Number(latest.averageWeightKg)).toLocaleString(),
      suffix: 'kg',
      caption: `Weighed on ${shortDay(latest.date)}`,
      change: gain == null ? null : { up: gain >= 0, text: `${gain >= 0 ? '+' : ''}${gain} kg since ${shortDay(prev.date)}` },
      extras,
      points: samples.length >= 2 ? samples.slice(-10).map((w) => ({ label: shortDay(w.date), value: Number(w.averageWeightKg) })) : null,
      thin: 'Weigh a sample again to see growth over time.',
      formatTick: (v) => `${round1(v)}kg`,
    };
  }

  // Everything else: birds alive at the end of each of the last 14 days.
  const placed = Number(batch.birdCount) || 0;
  const mortality = logs?.mortality || [];
  const start = batch.startDate ? batch.startDate.slice(0, 10) : null;
  const firstDay = start && start > isoDaysAgo(CHART_DAYS - 1) ? start : isoDaysAgo(CHART_DAYS - 1);
  const points = [];
  for (let d = new Date(`${firstDay}T00:00:00`); toIso(d) <= toIso(new Date()); d.setDate(d.getDate() + 1)) {
    const iso = toIso(d);
    const lost = mortality.filter((m) => m.date && m.date <= iso).reduce((s, m) => s + (Number(m.count) || 0), 0);
    points.push({ label: shortDay(iso), value: Math.max(0, placed - lost) });
  }
  const lostThisWeek = mortality
    .filter((m) => m.date && m.date >= isoDaysAgo(6))
    .reduce((s, m) => s + (Number(m.count) || 0), 0);

  return {
    kind: 'alive',
    title: 'Birds Alive',
    value: currentBirds.toLocaleString(),
    suffix: 'birds',
    caption: `Age ${batchAge(batch)}`,
    change: { up: lostThisWeek === 0, text: lostThisWeek === 0 ? 'No losses this week' : `${lostThisWeek} lost this week` },
    extras: placed ? [{ label: 'Survival', value: `${round1((currentBirds / placed) * 100)}%` }] : [],
    points: points.length >= 2 ? points : null,
    thin: 'The trend appears after the batch\'s second day.',
    formatTick: (v) => Math.round(v).toLocaleString(),
  };
}
