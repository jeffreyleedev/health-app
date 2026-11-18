/**
 * Groups weigh-ins and calorie entries into periods for the history view.
 *
 * Cadence controls grouping only; it never restricts logging.
 *  - Weight: average of every weigh-in in the period.
 *  - Calories: entries on the same day are summed into a daily total, then
 *    the period shows the average of those daily totals, counting only days
 *    that have at least one entry (unlogged days are not treated as 0).
 *  - Periods with no data still appear, with null values, so gaps are visible.
 */

import {
  addDays,
  compareDates,
  formatDate,
  MONTH_NAMES,
  parseDate,
  startOfMonth,
  startOfNextMonth,
  startOfWeek,
  type DateString,
} from "./dates";

export type Cadence = "daily" | "weekly" | "monthly";

export interface WeighIn {
  date: DateString;
  weightKg: number;
}

export interface CalorieEntry {
  date: DateString;
  calories: number;
}

export interface HistoryPeriod {
  /** First day of the period (inclusive). */
  start: DateString;
  /** Last day of the period (inclusive). */
  end: DateString;
  averageWeightKg: number | null;
  weighInCount: number;
  averageDailyCalories: number | null;
  /** Days in this period with at least one calorie entry. */
  loggedCalorieDays: number;
}

/** Start of the period containing `date`. */
export function periodStart(date: DateString, cadence: Cadence): DateString {
  switch (cadence) {
    case "daily":
      return date;
    case "weekly":
      return startOfWeek(date);
    case "monthly":
      return startOfMonth(date);
  }
}

/** Start of the period after the one beginning at `start`. */
function nextPeriodStart(start: DateString, cadence: Cadence): DateString {
  switch (cadence) {
    case "daily":
      return addDays(start, 1);
    case "weekly":
      return addDays(start, 7);
    case "monthly":
      return startOfNextMonth(start);
  }
}

/** Start of the period before the one beginning at `start`. */
function previousPeriodStart(start: DateString, cadence: Cadence): DateString {
  switch (cadence) {
    case "daily":
      return addDays(start, -1);
    case "weekly":
      return addDays(start, -7);
    case "monthly":
      return startOfMonth(addDays(start, -1)); // the 1st of the previous calendar month
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Builds every period from the one containing the earliest entry through
 * the one containing the latest entry, oldest first.
 */
export function groupHistory(weighIns: WeighIn[], calorieEntries: CalorieEntry[], cadence: Cadence): HistoryPeriod[] {
  const allDates = [...weighIns.map((w) => w.date), ...calorieEntries.map((c) => c.date)];
  if (allDates.length === 0) return [];

  allDates.sort(compareDates);
  const firstStart = periodStart(allDates[0], cadence);
  const lastStart = periodStart(allDates[allDates.length - 1], cadence);
  return buildPeriods(weighIns, calorieEntries, cadence, firstStart, lastStart);
}

/** First day of the oldest period in a `count`-period window ending with today's period. */
export function windowStart(today: DateString, cadence: Cadence, count: number): DateString {
  let start = periodStart(today, cadence);
  for (let i = 1; i < count; i++) start = previousPeriodStart(start, cadence);
  return start;
}

/**
 * The `count` periods ending with the one containing `today`, oldest first.
 * Empty periods are included; entries outside the window are ignored.
 */
export function recentHistory(
  weighIns: WeighIn[],
  calorieEntries: CalorieEntry[],
  cadence: Cadence,
  today: DateString,
  count: number,
): HistoryPeriod[] {
  return buildPeriods(
    weighIns,
    calorieEntries,
    cadence,
    windowStart(today, cadence, count),
    periodStart(today, cadence),
  );
}

/** How many periods the history screen shows. */
export const HISTORY_PERIODS = 12;

/**
 * Oldest date the server must load so the browser can build any cadence's
 * window. The server only knows UTC today; the user's local today can be up
 * to a day behind (UTC−12), so start from the earliest window of all.
 */
export function historyFetchStart(todayUtc: DateString, count = HISTORY_PERIODS): DateString {
  const earliestLocalToday = addDays(todayUtc, -1);
  const starts = (["daily", "weekly", "monthly"] as const).map((c) => windowStart(earliestLocalToday, c, count));
  return starts.sort(compareDates)[0];
}

/** "Nov 17, 2026" · "Nov 16–22, 2026" · "Nov 30 – Dec 6, 2026" · "Nov 2026". */
export function formatPeriod(period: { start: DateString; end: DateString }, cadence: Cadence): string {
  if (cadence === "daily") return formatDate(period.start);
  const s = parseDate(period.start);
  const e = parseDate(period.end);
  if (cadence === "monthly") return `${MONTH_NAMES[s.month - 1]} ${s.year}`;
  if (s.year !== e.year) return `${formatDate(period.start)} – ${formatDate(period.end)}`;
  if (s.month !== e.month)
    return `${MONTH_NAMES[s.month - 1]} ${s.day} – ${MONTH_NAMES[e.month - 1]} ${e.day}, ${e.year}`;
  return `${MONTH_NAMES[s.month - 1]} ${s.day}–${e.day}, ${s.year}`;
}

/** Periods from firstStart through lastStart (inclusive), oldest first. */
function buildPeriods(
  weighIns: WeighIn[],
  calorieEntries: CalorieEntry[],
  cadence: Cadence,
  firstStart: DateString,
  lastStart: DateString,
): HistoryPeriod[] {
  // Bucket weigh-ins by period start.
  const weightsByPeriod = new Map<DateString, number[]>();
  for (const w of weighIns) {
    const key = periodStart(w.date, cadence);
    const list = weightsByPeriod.get(key) ?? [];
    list.push(w.weightKg);
    weightsByPeriod.set(key, list);
  }

  // Sum calories per day, then bucket each day's total by period start.
  const dailyTotals = new Map<DateString, number>();
  for (const c of calorieEntries) {
    dailyTotals.set(c.date, (dailyTotals.get(c.date) ?? 0) + c.calories);
  }
  const dailyTotalsByPeriod = new Map<DateString, number[]>();
  for (const [date, total] of dailyTotals) {
    const key = periodStart(date, cadence);
    const list = dailyTotalsByPeriod.get(key) ?? [];
    list.push(total);
    dailyTotalsByPeriod.set(key, list);
  }

  const periods: HistoryPeriod[] = [];
  for (let start = firstStart; compareDates(start, lastStart) <= 0; start = nextPeriodStart(start, cadence)) {
    const next = nextPeriodStart(start, cadence);
    const weights = weightsByPeriod.get(start) ?? [];
    const calorieDays = dailyTotalsByPeriod.get(start) ?? [];
    periods.push({
      start,
      end: addDays(next, -1),
      averageWeightKg: average(weights),
      weighInCount: weights.length,
      averageDailyCalories: average(calorieDays),
      loggedCalorieDays: calorieDays.length,
    });
  }
  return periods;
}
