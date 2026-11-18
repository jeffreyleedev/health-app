import { describe, expect, it } from "vitest";
import { ACTIVITY_LEVELS, bmi, bmiCategory, bmr, tdee } from "./formulas";

describe("bmr (Mifflin-St Jeor)", () => {
  it("adds 5 for males", () => {
    // 10×80 + 6.25×180 − 5×30 + 5 = 800 + 1125 − 150 + 5
    expect(bmr({ weightKg: 80, heightCm: 180, ageYears: 30, sex: "male" })).toBe(1780);
  });

  it("subtracts 161 for females", () => {
    // 10×60 + 6.25×165 − 5×25 − 161 = 600 + 1031.25 − 125 − 161
    expect(bmr({ weightKg: 60, heightCm: 165, ageYears: 25, sex: "female" })).toBe(1345.25);
  });

  it("rejects non-positive weight or height", () => {
    expect(() => bmr({ weightKg: 0, heightCm: 180, ageYears: 30, sex: "male" })).toThrow(RangeError);
    expect(() => bmr({ weightKg: 80, heightCm: -1, ageYears: 30, sex: "male" })).toThrow(RangeError);
  });
});

describe("tdee", () => {
  it("multiplies BMR by the activity multiplier", () => {
    expect(tdee(1780, "sedentary")).toBeCloseTo(2136, 10);
    expect(tdee(1780, "moderatelyActive")).toBeCloseTo(2759, 10);
    expect(tdee(1780, "extraActive")).toBeCloseTo(3382, 10);
  });

  it("uses the five agreed levels", () => {
    expect(Object.values(ACTIVITY_LEVELS).map((l) => l.multiplier)).toEqual([1.2, 1.375, 1.55, 1.725, 1.9]);
  });
});

describe("bmi", () => {
  it("divides kg by height in metres squared", () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
    expect(bmi(60, 165)).toBeCloseTo(22.04, 2);
  });
});

describe("bmiCategory", () => {
  it("uses the standard adult boundaries", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("healthy");
    expect(bmiCategory(24.9)).toBe("healthy");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(29.9)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obesity");
  });

  it("matches the rounded number shown to the user", () => {
    expect(bmiCategory(24.96)).toBe("overweight"); // shown as 25.0
    expect(bmiCategory(24.94)).toBe("healthy"); // shown as 24.9
    expect(bmiCategory(18.46)).toBe("healthy"); // shown as 18.5
  });
});
