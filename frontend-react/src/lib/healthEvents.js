import { supplementDates, findSupplementType, toIso } from './supplements';

/**
 * Turns everything health-related into one list of calendar appointments:
 * scheduled vaccinations (upcoming / overdue / done), vaccinations recorded
 * as given, and vitamin courses (one appointment per day of the course).
 *
 * status is one of: 'upcoming' | 'overdue' | 'done' | 'supplement'.
 */
export function buildHealthEvents({ schedules = [], records = [], supplements = [], batchNames = {} }) {
  const today = toIso(new Date());
  const events = [];

  // A schedule marked done through the record form has a linked record; show
  // the record (it has the detail) and skip the schedule so it isn't doubled.
  const linkedScheduleIds = new Set(records.map((r) => r.scheduleId).filter(Boolean));

  schedules.forEach((s) => {
    if (!s.dueDate || linkedScheduleIds.has(s.scheduleId)) return;
    const overdue = s.status === 'missed' || (s.status === 'upcoming' && s.dueDate < today);
    events.push({
      id: `s-${s.scheduleId}`,
      date: s.dueDate,
      kind: 'vaccine',
      status: s.status === 'done' ? 'done' : overdue ? 'overdue' : 'upcoming',
      title: s.vaccineName,
      batchId: s.batchId,
      batchName: s.batchName || batchNames[s.batchId] || '',
      detail: [s.doseNumber, s.reminderTiming && s.status === 'upcoming' ? `Reminder: ${s.reminderTiming}` : null].filter(Boolean).join(' · '),
      source: s,
    });
  });

  records.forEach((r) => {
    if (!r.dateAdministered) return;
    events.push({
      id: `r-${r.entryId || r.dateAdministered + r.vaccineName}`,
      date: r.dateAdministered,
      kind: 'vaccine',
      status: 'done',
      title: r.vaccineName,
      batchId: r.batchId,
      batchName: r.batchName || batchNames[r.batchId] || '',
      detail: [r.doseNumber, r.birdsVaccinated ? `${Number(r.birdsVaccinated).toLocaleString()} birds` : null].filter(Boolean).join(' · '),
      source: r,
    });
  });

  supplements.forEach((m) => {
    const dates = supplementDates(m);
    const typeLabel = findSupplementType(m.type)?.label;
    dates.forEach((date, i) => {
      events.push({
        id: `m-${m.id}-${i}`,
        date,
        kind: 'supplement',
        status: 'supplement',
        title: m.product || typeLabel || 'Supplement',
        batchId: m.batchId,
        batchName: m.batchName || batchNames[m.batchId] || '',
        detail: dates.length > 1 ? `Day ${i + 1} of ${dates.length}` : typeLabel || '',
        source: m,
      });
    });
  });

  // Overdue first, then upcoming, then the rest — so the chips that need
  // action are the ones visible when a day overflows.
  const rank = { overdue: 0, upcoming: 1, supplement: 2, done: 3 };
  return events.sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Tailwind classes per status, shared by the calendar chips and legends. */
export const EVENT_STYLES = {
  upcoming: { chip: 'bg-[#F7FFE0] dark:bg-[#142312] text-[#3A4D00] dark:text-[#DFFF83] border-l-[#B7DA3E] dark:border-l-[#DFFF83]', dot: 'bg-[#DFFF83]', label: 'Vaccine due' },
  overdue: { chip: 'bg-rose-50 dark:bg-[#260D12] text-rose-800 dark:text-[#FB7185] border-l-rose-500 dark:border-l-[#FB7185]', dot: 'bg-rose-500', label: 'Overdue' },
  done: { chip: 'bg-stone-100 dark:bg-[#1E2124] text-stone-500 dark:text-[#94A3B8] border-l-stone-400 dark:border-l-[#475569]', dot: 'bg-stone-400 dark:bg-[#64748B]', label: 'Vaccine given' },
  supplement: { chip: 'bg-amber-50 dark:bg-[#261B06] text-amber-900 dark:text-[#FCD34D] border-l-amber-500 dark:border-l-[#FCD34D]', dot: 'bg-amber-500', label: 'Vitamin / supplement' },
};
