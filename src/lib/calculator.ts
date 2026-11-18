/**
 * Calculator logic for the BMR/TDEE section (Calories page) and the BMI
 * page. Pure, so the browser runs it
 * instantly and tests can check whole results. Nothing here is saved.
 */

import { ageOn } from "./age";
import type { DateString } from "./dates";
import { parseWeight } from "./entry-validation";
import {
  ACTIVITY_LEVELS,
  bmi,
  bmiCategory,
  bmr,
  tdee,
  type ActivityLevel,
  type BmiCategory,
  type Sex,
} from "./formulas";
import { displayWeight, KG_PER_LB, roundTo, type UnitSystem } from "./units";

export interface CalculatorStats {
  birthdate: DateString;
  sex: Sex;
  heightCm: number;
}

export interface CalculatorResult {
  ageYears: number;
  /** kcal/day, whole numbers. */
  bmr: number;
  tdeeByLevel: Record<ActivityLevel, number>;
  /** 1 decimal. */
  bmi: number;
  bmiCategory: BmiCategory;
}

/** BMI (1 decimal) and its adult category. Needs no age, so no date either. */
export function calculateBmi(weightKg: number, heightCm: number): { bmi: number; bmiCategory: BmiCategory } {
  const value = bmi(weightKg, heightCm);
  return { bmi: roundTo(value, 1), bmiCategory: bmiCategory(value) };
}

export function calculate(input: { weightKg: number; stats: CalculatorStats; today: DateString }): CalculatorResult {
  const { weightKg, stats, today } = input;
  const ageYears = ageOn(stats.birthdate, today);
  const bmrValue = bmr({ weightKg, heightCm: stats.heightCm, ageYears, sex: stats.sex });
  const tdeeByLevel = Object.fromEntries(
    (Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((level) => [level, Math.round(tdee(bmrValue, level))]),
  ) as Record<ActivityLevel, number>;

  return {
    ageYears,
    bmr: Math.round(bmrValue),
    tdeeByLevel,
    ...calculateBmi(weightKg, stats.heightCm),
  };
}

/** How the latest weigh-in appears in the weight box, e.g. "180.0". */
export function weightBoxText(kg: number, unitSystem: UnitSystem): string {
  return displayWeight(kg, unitSystem).value.toFixed(1);
}

/**
 * Which weight a calculator uses (each page's weight box is separate).
 *   typed === null, or unchanged from the box's starting text → the stored kg
 *     (not the rounded number shown, which would shift results slightly)
 *   anything else → the typed weight, checked against the logging range
 */
export function chosenWeight(
  typed: string | null,
  latestKg: number | null,
  unitSystem: UnitSystem,
):
  | { kind: "latest"; kg: number }
  | { kind: "preview"; kg: number }
  | { kind: "error"; error: string }
  | { kind: "empty" } {
  const startText = latestKg === null ? "" : weightBoxText(latestKg, unitSystem);
  if (typed === null || typed === startText) {
    return latestKg === null ? { kind: "empty" } : { kind: "latest", kg: latestKg };
  }
  const parsed = parseWeight(typed, unitSystem);
  return parsed.ok ? { kind: "preview", kg: parsed.kg } : { kind: "error", error: parsed.error };
}

// ---------------------------------------------------------------------------
// Weight-loss targets: daily calories to lose a set amount per week.
// ---------------------------------------------------------------------------

/** Rule of thumb: about 3,500 calories per pound of body fat. */
export const CALORIES_PER_LB = 3500;
/** The same rule per kg (3,500 ÷ 0.45359237 ≈ 7,716), so lb and kg agree. */
export const CALORIES_PER_KG = CALORIES_PER_LB / KG_PER_LB;

/** Commonly cited minimum daily intake without medical supervision. */
export const MIN_SAFE_CALORIES: Record<Sex, number> = { female: 1200, male: 1500 };

export interface WeightLossTarget {
  /** e.g. "Lose 1 lb/week" or "Lose 0.5 kg/week". */
  label: string;
  /** Whole calories per day, or null if it would be zero or below. */
  calories: number | null;
  /** True if below MIN_SAFE_CALORIES for the user's sex (or not possible). */
  belowMinimum: boolean;
}

/**
 * Daily calories for the two weekly goals (1 and 2 lb, or 0.5 and 1 kg).
 * Starts from the displayed (rounded) TDEE so the numbers subtract cleanly.
 */
export function weightLossTargets(tdeeShown: number, unitSystem: UnitSystem, sex: Sex): WeightLossTarget[] {
  const goals =
    unitSystem === "imperial"
      ? [
          { amount: 1, label: "Lose 1 lb/week", perUnit: CALORIES_PER_LB },
          { amount: 2, label: "Lose 2 lb/week", perUnit: CALORIES_PER_LB },
        ]
      : [
          { amount: 0.5, label: "Lose 0.5 kg/week", perUnit: CALORIES_PER_KG },
          { amount: 1, label: "Lose 1 kg/week", perUnit: CALORIES_PER_KG },
        ];

  return goals.map(({ amount, label, perUnit }) => {
    const dailyDeficit = Math.round((amount * perUnit) / 7);
    const calories = tdeeShown - dailyDeficit;
    return {
      label,
      calories: calories > 0 ? calories : null,
      belowMinimum: calories < MIN_SAFE_CALORIES[sex],
    };
  });
}
