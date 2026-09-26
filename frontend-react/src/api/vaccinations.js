import { createLog, getLogs } from './logs';
import { createSchedule, updateSchedule } from './schedule';

/** Vaccinations recorded as given (the backward-looking history). */
export function getVaccinationRecords(batchId) {
  return getLogs(batchId, 'vaccinations');
}

/**
 * Saves what the vaccination form produced.
 *
 * mode 'schedule' → a future due date on the vaccination schedule, which the
 * daily reminder job picks up.
 * mode 'record' → a vaccination that was actually given, in the history.
 * When it fulfils a scheduled one (scheduleId), that schedule is also marked
 * done so it stops showing as due.
 */
export async function saveVaccination({ mode, batchId, scheduleId, ...fields }) {
  if (mode === 'schedule') {
    return { mode, item: await createSchedule(batchId, fields) };
  }

  const item = await createLog(batchId, 'vaccinations', { ...fields, ...(scheduleId ? { scheduleId } : {}) });
  if (scheduleId) {
    try {
      await updateSchedule(batchId, scheduleId, { status: 'done' });
    } catch (err) {
      // The record itself saved; the schedule will still show as due, which
      // is the safer failure than losing the record.
      console.warn('Could not mark schedule as done:', err);
    }
  }
  return { mode, item };
}
