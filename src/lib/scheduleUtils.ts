/**
 * @module lib/scheduleUtils
 * @overview Shared utility functions for scheduling operations.
 * @responsibilities
 *   - Date parsing and validation helpers
 *   - Common date utilities used across schedule actions and UI components
 * @exports
 *   - `parseDateOnly`: Parse a date string to start-of-day Date
 *   - `isPastDate`: Check if a date is in the past
 *   - `toDateStr`: Convert Date to "YYYY-MM-DD" string
 *   - `mondayOf`: Get the Monday of the week containing a given date
 *   - `todayStr`: Get today's date as "YYYY-MM-DD" string
 */

/**
 * Parse a date string (YYYY-MM-DD) and return a Date object at start of day.
 */
export function parseDateOnly(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if a date is in the past (before today).
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

/**
 * Convert a Date object to "YYYY-MM-DD" string format.
 */
export function toDateStr(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get today's date as "YYYY-MM-DD" string.
 */
export function todayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/**
 * Get the Monday of the week containing the given date.
 * Returns a new Date object with time set to 00:00:00.
 */
export function mondayOf(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  return copy;
}
