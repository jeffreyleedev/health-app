/**
 * Health formulas. All inputs are metric; convert before calling.
 * These run in the frontend and their results are never stored.
 */

export type Sex = "male" | "female";

/** TDEE = BMR × one of these standard multipliers. */
export const ACTIVITY_LEVELS = {
  sedentary: { label: "Sedentary (little or no exercise)", multiplier: 1.2 },
  lightlyActive: { label: "Lightly active (1–3 days/week)", multiplier: 1.375 },
  moderatelyActive: { label: "Moderately active (3–5 days/week)", multiplier: 1.55 },
  veryActive: { label: "Very active (6–7 days/week)", multiplier: 1.725 },
  extraActive: { label: "Extra active (physical job or 2×/day)", multiplier: 1.9 },
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

function requirePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive number, got ${value}`);
  }
}

/**
 * Basal Metabolic Rate (kcal/day), Mifflin-St Jeor:
 *   10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) + s
 *   where s = +5 for males, −161 for females.
 */
export function bmr(input: { weightKg: number; heightCm: number; ageYears: number; sex: Sex }): number {
  const { weightKg, heightCm, ageYears, sex } = input;
  requirePositive("weightKg", weightKg);
  requirePositive("heightCm", heightCm);
  if (!Number.isFinite(ageYears) || ageYears < 0) {
    throw new RangeError(`ageYears must be zero or more, got ${ageYears}`);
  }
  const sexConstant = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexConstant;
}

/** Total Daily Energy Expenditure (kcal/day). */
export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return bmrValue * ACTIVITY_LEVELS[activity].multiplier;
}

/** Body Mass Index: kg / m². */
export function bmi(weightKg: number, heightCm: number): number {
  requirePositive("weightKg", weightKg);
  requirePositive("heightCm", heightCm);
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export type BmiCategory = "underweight" | "healthy" | "overweight" | "obesity";

/** Standard adult BMI categories. */
export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: "Underweight (under 18.5)",
  healthy: "Healthy weight (18.5–24.9)",
  overweight: "Overweight (25–29.9)",
  obesity: "Obesity (30 and over)",
};

/**
 * Text color for each category (blue, green, amber, red), as theme colors
 * from globals.css. Full class names on purpose: Tailwind only generates
 * styles for class names written out in the code, so "text-" + name
 * would silently produce no color.
 */
export const BMI_CATEGORY_COLOR: Record<BmiCategory, string> = {
  underweight: "text-info",
  healthy: "text-success",
  overweight: "text-warning",
  obesity: "text-danger",
};

/**
 * Category for a BMI. Uses the value rounded to 1 decimal — the number the
 * user sees — so a raw 24.96 shows as "25.0, Overweight", never "25.0, Healthy".
 */
export function bmiCategory(bmiValue: number): BmiCategory {
  const shown = Math.round(bmiValue * 10) / 10;
  if (shown < 18.5) return "underweight";
  if (shown < 25) return "healthy";
  if (shown < 30) return "overweight";
  return "obesity";
}
