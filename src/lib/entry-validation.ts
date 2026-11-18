/**
 * Validates the weigh-in and calorie forms and converts them to stored values.
 * Pure: no Supabase or Next.js imports, so it's unit tested directly.
 *
 * Date rule: the browser fills in and limits dates using the user's local
 * today. The server can't know that date, so it allows up to UTC today + 1
 * day — the furthest ahead any time zone (UTC+14) can be. That rejects
 * clearly-future dates without blocking anyone's real today.
 */

import { addDays, compareDates, isValidDate, type DateString } from "./dates";
import { KG_PER_LB, weightInputToKg, type UnitSystem } from "./units";

export const MIN_WEIGHT_KG = 25;
export const MAX_WEIGHT_KG = 400;
export const MAX_CALORIES = 10_000;

// The kg limits in pounds, rounded inward so every number shown is actually accepted.
const MIN_WEIGHT_LB = Math.ceil(MIN_WEIGHT_KG / KG_PER_LB); // 56
const MAX_WEIGHT_LB = Math.floor(MAX_WEIGHT_KG / KG_PER_LB); // 881

/** Inclusive range of dates an entry may have. */
export interface DateLimits {
  earliest: DateString;
  latest: DateString;
}

/** Oldest = the user's birthdate; newest = UTC today + 1 day. */
export function entryDateLimits(birthdate: DateString, todayUtc: DateString): DateLimits {
  return { earliest: birthdate, latest: addDays(todayUtc, 1) };
}

type Result<V, F extends string> = { ok: true; value: V } | { ok: false; errors: Partial<Record<F, string>> };

export type WeighInField = "date" | "weight";
export type CalorieField = "date" | "calories";

export interface WeighInInput {
  date: DateString;
  weightKg: number;
}

export interface CalorieInput {
  date: DateString;
  calories: number;
}

/**
 * A weight typed in the user's units → kg (2 decimals), within 25–400 kg.
 * Shared by the weigh-in form and the calculator override.
 */
export function parseWeight(
  raw: string | undefined,
  unitSystem: UnitSystem,
): { ok: true; kg: number } | { ok: false; error: string } {
  const text = raw?.trim() ?? "";
  const n = text === "" ? NaN : Number(text);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: `Enter a weight in ${unitSystem === "metric" ? "kg" : "lb"}.` };
  }
  const kg = weightInputToKg(n, unitSystem);
  if (kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) {
    return {
      ok: false,
      error:
        unitSystem === "metric"
          ? `Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`
          : `Weight must be between ${MIN_WEIGHT_LB} and ${MAX_WEIGHT_LB} lb.`,
    };
  }
  return { ok: true, kg };
}

function dateError(date: string | undefined, limits: DateLimits): string | undefined {
  if (!date || !isValidDate(date)) return "Enter a date.";
  if (compareDates(date, limits.latest) > 0) return "Date can't be in the future.";
  if (compareDates(date, limits.earliest) < 0) return "Date can't be before your date of birth.";
  return undefined;
}

/** Checks just a date against the entry limits (used when only the date changes). */
export function parseEntryDate(
  date: string | undefined,
  limits: DateLimits,
): { ok: true; date: DateString } | { ok: false; error: string } {
  const error = dateError(date, limits);
  return error ? { ok: false, error } : { ok: true, date: date as DateString };
}

export function parseWeighInForm(
  values: { date?: string; weight?: string },
  unitSystem: UnitSystem,
  limits: DateLimits,
): Result<WeighInInput, WeighInField> {
  const errors: Partial<Record<WeighInField, string>> = {};

  const dateErr = dateError(values.date, limits);
  if (dateErr) errors.date = dateErr;

  const weight = parseWeight(values.weight, unitSystem);
  if (!weight.ok) errors.weight = weight.error;
  const weightKg = weight.ok ? weight.kg : null;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { date: values.date as DateString, weightKg: weightKg as number } };
}

export function parseCalorieForm(
  values: { date?: string; calories?: string },
  limits: DateLimits,
): Result<CalorieInput, CalorieField> {
  const errors: Partial<Record<CalorieField, string>> = {};

  const dateErr = dateError(values.date, limits);
  if (dateErr) errors.date = dateErr;

  const raw = values.calories?.trim() ?? "";
  // Digits only: rejects "", "-5", "1.5", "1e3".
  const calories = /^\d+$/.test(raw) ? Number(raw) : null;
  if (calories === null) errors.calories = "Enter calories as a whole number.";
  else if (calories > MAX_CALORIES) errors.calories = `Calories must be ${MAX_CALORIES.toLocaleString("en-US")} or less per entry.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { date: values.date as DateString, calories: calories as number } };
}

/**
 * An entry id sent by the browser. Untrusted: accept only a positive whole
 * number (database ids are 1, 2, 3, ...), so junk never reaches a query.
 */
export function parseEntryId(raw: string | undefined): number | null {
  if (!raw || !/^[1-9]\d{0,15}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
