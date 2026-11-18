import { compareDates, parseDate, type DateString } from "./dates";

/**
 * Age in whole years on a given day.
 *
 * Only the birthdate is stored; age is always derived, so it never goes
 * stale. `today` is a parameter rather than read from the clock so the
 * result is predictable and testable.
 *
 * Someone born on Feb 29 turns a year older on Mar 1 in non-leap years.
 */
export function ageOn(birthdate: DateString, today: DateString): number {
  if (compareDates(birthdate, today) > 0) {
    throw new RangeError(`Birthdate ${birthdate} is after ${today}`);
  }
  const birth = parseDate(birthdate);
  const now = parseDate(today);

  let age = now.year - birth.year;
  const birthdayNotYetReached =
    now.month < birth.month || (now.month === birth.month && now.day < birth.day);
  if (birthdayNotYetReached) age -= 1;
  return age;
}
