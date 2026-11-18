import { describe, expect, it } from "vitest";
import { calculate, calculateBmi, chosenWeight, weightBoxText, weightLossTargets } from "./calculator";

describe("calculate", () => {
  it("matches hand-worked Mifflin-St Jeor numbers", () => {
    // Age 30 today. BMR = 10×80 + 6.25×180 − 5×30 + 5 = 1780.
    const r = calculate({
      weightKg: 80,
      stats: { birthdate: "1996-11-17", sex: "male", heightCm: 180 },
      today: "2026-11-17",
    });
    expect(r).toEqual({
      ageYears: 30,
      bmr: 1780,
      tdeeByLevel: {
        sedentary: 2136, // 1780 × 1.2
        lightlyActive: 2448, // 1780 × 1.375 = 2447.5
        moderatelyActive: 2759, // × 1.55
        veryActive: 3071, // × 1.725 = 3070.5
        extraActive: 3382, // × 1.9
      },
      bmi: 24.7, // 80 / 1.8² = 24.69
      bmiCategory: "healthy",
    });
  });

  it("uses age on the given day (birthday not reached yet)", () => {
    // Turns 30 tomorrow, so 29 today: BMR = 600 + 1031.25 − 145 − 161 = 1325.25.
    const r = calculate({
      weightKg: 60,
      stats: { birthdate: "1996-11-18", sex: "female", heightCm: 165 },
      today: "2026-11-17",
    });
    expect(r.ageYears).toBe(29);
    expect(r.bmr).toBe(1325);
  });
});

describe("calculateBmi", () => {
  it("rounds to 1 decimal and picks the category from the shown value", () => {
    expect(calculateBmi(80, 180)).toEqual({ bmi: 24.7, bmiCategory: "healthy" }); // 24.69
    expect(calculateBmi(81, 180)).toEqual({ bmi: 25, bmiCategory: "overweight" }); // 25.0
    expect(calculateBmi(50, 170)).toEqual({ bmi: 17.3, bmiCategory: "underweight" });
  });
});

describe("chosenWeight", () => {
  it("uses the stored kg until the box is changed", () => {
    // 72.46 kg shows as 159.7 lb; converting 159.7 back would give 72.44.
    expect(weightBoxText(72.46, "imperial")).toBe("159.7");
    expect(chosenWeight(null, 72.46, "imperial")).toEqual({ kind: "latest", kg: 72.46 });
    expect(chosenWeight("159.7", 72.46, "imperial")).toEqual({ kind: "latest", kg: 72.46 });
  });

  it("previews a typed weight in the user's units", () => {
    expect(chosenWeight("170", 72.46, "imperial")).toEqual({ kind: "preview", kg: 77.11 });
    expect(chosenWeight("70", 72.46, "metric")).toEqual({ kind: "preview", kg: 70 });
  });

  it("rejects typed weights outside the logging range", () => {
    expect(chosenWeight("1800", 72.46, "imperial")).toMatchObject({ kind: "error" });
    expect(chosenWeight("", 72.46, "metric")).toMatchObject({ kind: "error" });
  });

  it("is empty with no weigh-in until a weight is typed", () => {
    expect(chosenWeight(null, null, "metric")).toEqual({ kind: "empty" });
    expect(chosenWeight("", null, "metric")).toEqual({ kind: "empty" });
    expect(chosenWeight("80", null, "metric")).toEqual({ kind: "preview", kg: 80 });
  });
});

describe("weightLossTargets", () => {
  it("subtracts 500 and 1,000 a day for 1 and 2 lb a week", () => {
    expect(weightLossTargets(2759, "imperial", "male")).toEqual([
      { label: "Lose 1 lb/week", calories: 2259, belowMinimum: false },
      { label: "Lose 2 lb/week", calories: 1759, belowMinimum: false },
    ]);
  });

  it("subtracts about 551 and 1,102 a day for 0.5 and 1 kg a week", () => {
    expect(weightLossTargets(2759, "metric", "male")).toEqual([
      { label: "Lose 0.5 kg/week", calories: 2208, belowMinimum: false },
      { label: "Lose 1 kg/week", calories: 1657, belowMinimum: false },
    ]);
  });

  it("warns below 1,200 for women and 1,500 for men, not at the minimum itself", () => {
    expect(weightLossTargets(1700, "imperial", "female")[0]).toMatchObject({ calories: 1200, belowMinimum: false });
    expect(weightLossTargets(1699, "imperial", "female")[0]).toMatchObject({ calories: 1199, belowMinimum: true });
    expect(weightLossTargets(2000, "imperial", "male")[0]).toMatchObject({ calories: 1500, belowMinimum: false });
    expect(weightLossTargets(1999, "imperial", "male")[0]).toMatchObject({ calories: 1499, belowMinimum: true });
    // The same 1,350 is fine for a woman but below the men's minimum.
    expect(weightLossTargets(1850, "imperial", "female")[0].belowMinimum).toBe(false);
    expect(weightLossTargets(1850, "imperial", "male")[0].belowMinimum).toBe(true);
  });

  it("says not possible instead of zero or negative calories", () => {
    expect(weightLossTargets(1000, "imperial", "female")[1]).toEqual({
      label: "Lose 2 lb/week",
      calories: null,
      belowMinimum: true,
    });
    expect(weightLossTargets(500, "imperial", "female")[0].calories).toBeNull(); // exactly 0
  });
});
