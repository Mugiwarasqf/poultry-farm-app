/**
 * Records (eggs, mortality, feed, weight, vaccinations given, sick bay, feed
 * purchases) describe something that already happened, so their date can't
 * be in the future. Backdating stays allowed: farmers fill in missed days.
 *
 * "Today" allows one day of slack past the UTC date. Nigeria is UTC+1, so
 * between midnight and 1am local the farmer's today is already tomorrow in
 * UTC, and an entry made then must not be rejected.
 *
 * Returns an error message, or null when the date is fine.
 */
export function checkRecordDate(date: unknown, field = "date"): string | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return `${field} must be a date in YYYY-MM-DD format`;
  }
  const latest = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (date > latest) return `${field} cannot be in the future`;
  return null;
}

/**
 * The same check on a log record, whichever date field it uses: most logs
 * have `date`, vaccination records have `dateAdministered`.
 */
export function checkRecordDateOf(record: Record<string, unknown>): string | null {
  if (record.dateAdministered !== undefined && record.date === undefined) {
    return checkRecordDate(record.dateAdministered, "dateAdministered");
  }
  return checkRecordDate(record.date);
}
