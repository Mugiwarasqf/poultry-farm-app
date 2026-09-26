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
  upcoming: { chip: 'bg-[#EAF5EF] text-[#0D472B] border-l-[#0D5C3A]', dot: 'bg-[#0D5C3A]', label: 'Vaccine due' },
  overdue: { chip: 'bg-rose-50 text-rose-800 border-l-rose-500', dot: 'bg-rose-500', label: 'Overdue' },
  done: { chip: 'bg-stone-100 text-stone-500 border-l-stone-400', dot: 'bg-stone-400', label: 'Vaccine given' },
  supplement: { chip: 'bg-amber-50 text-amber-900 border-l-amber-500', dot: 'bg-amber-500', label: 'Vitamin / supplement' },
};
