/**
 * Parses a date-only value ("2026-11-05") as local midnight.
 * new Date("2026-11-05") is UTC midnight, which shows as the day before in US time zones.
 * Full timestamps are parsed as usual.
 */
export function localDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

/** True when a date-only due date is before today (a task due today is not overdue). */
export function isPastDue(value: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return localDate(value) < today;
}
