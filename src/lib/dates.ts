/**
 * Calendar-date helpers.
 *
 * Dates are plain "YYYY-MM-DD" strings with no time or time zone, so a
 * phone and a laptop in different time zones always agree on which day
 * an entry belongs to. Internally, date math converts each date to a
 * "day number" (whole days since 1970-01-01, computed in UTC) so adding
 * days or finding a week's Monday is simple integer arithmetic.
 */

export type DateString = string; // "YYYY-MM-DD"

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True if the string is a real calendar date in "YYYY-MM-DD" form. */
export function isValidDate(date: string): boolean {
  const match = DATE_PATTERN.exec(date);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  // Date.UTC rolls invalid dates over (Feb 30 -> Mar 2), so check the round trip.
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}

/** Splits a date into numeric parts, throwing on malformed input. */
export function parseDate(date: DateString): { year: number; month: number; day: number } {
  if (!isValidDate(date)) {
    throw new RangeError(`Invalid date "${date}" — expected a real date as YYYY-MM-DD`);
  }
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** Whole days since 1970-01-01. */
export function toDayNumber(date: DateString): number {
  const { year, month, day } = parseDate(date);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Inverse of toDayNumber. */
export function fromDayNumber(dayNumber: number): DateString {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(date: DateString, days: number): DateString {
  return fromDayNumber(toDayNumber(date) + days);
}

/** 0 = Monday ... 6 = Sunday. */
export function dayOfWeekMondayFirst(date: DateString): number {
  const sundayFirst = new Date(toDayNumber(date) * MS_PER_DAY).getUTCDay();
  return (sundayFirst + 6) % 7;
}

/** The Monday on or before the given date. */
export function startOfWeek(date: DateString): DateString {
  return addDays(date, -dayOfWeekMondayFirst(date));
}

export function startOfMonth(date: DateString): DateString {
  return `${date.slice(0, 7)}-01`;
}

/** First day of the following month. */
export function startOfNextMonth(date: DateString): DateString {
  const { year, month } = parseDate(date);
  const next = new Date(Date.UTC(year, month, 1)); // month is 1-based, so this is next month
  return next.toISOString().slice(0, 10);
}

/** Today's calendar date in UTC. Pass `now` in tests for repeatable results. */
export function todayUtc(now: Date = new Date()): DateString {
  return now.toISOString().slice(0, 10);
}

/** Same month/day `years` earlier; Feb 29 falls back to Feb 28 in non-leap years. */
export function yearsBefore(date: DateString, years: number): DateString {
  const { year, month, day } = parseDate(date);
  const y = year - years;
  const candidate = `${String(y).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidDate(candidate) ? candidate : `${String(y).padStart(4, "0")}-02-28`;
}

/** Compares two dates: negative if a < b, 0 if equal, positive if a > b. */
export function compareDates(a: DateString, b: DateString): number {
  return toDayNumber(a) - toDayNumber(b);
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/**
 * Today's date in the device's own time zone. Call this in the browser:
 * on the server it would give the server's time zone, not the user's.
 */
export function localDateString(now: Date = new Date()): DateString {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-17" -> "Nov 17, 2026". Same result on every device (no locale or time zone). */
export function formatDate(date: DateString): string {
  const { year, month, day } = parseDate(date);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}
