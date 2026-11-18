import { describe, expect, it } from "vitest";
import {
  cmToFeetInches,
  displayHeight,
  displayWeight,
  feetInchesToCm,
  heightInputToCm,
  kgToLb,
  lbToKg,
  weightInputToKg,
} from "./units";

describe("weight conversion", () => {
  it("converts lb and kg using the exact factor", () => {
    expect(lbToKg(1)).toBe(0.45359237);
    expect(kgToLb(0.45359237)).toBeCloseTo(1, 10);
  });

  it("stores 180 lb as 81.65 kg and displays it back as 180.0 lb", () => {
    const stored = weightInputToKg(180, "imperial");
    expect(stored).toBe(81.65);
    expect(displayWeight(stored, "imperial")).toEqual({ value: 180, unit: "lb" });
    expect(displayWeight(stored, "metric")).toEqual({ value: 81.7, unit: "kg" });
  });

  it("stores metric input as-is (rounded to 2 decimals)", () => {
    expect(weightInputToKg(72.456, "metric")).toBe(72.46);
  });
});

describe("height conversion", () => {
  it("converts feet + inches to cm", () => {
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 10);
    expect(heightInputToCm({ feet: 5, inches: 10 })).toBe(177.8);
    expect(heightInputToCm({ cm: 180 })).toBe(180);
  });

  it("never produces 12 inches when converting back", () => {
    expect(cmToFeetInches(179.9)).toEqual({ feet: 5, inches: 11 });
    expect(cmToFeetInches(182.8)).toEqual({ feet: 6, inches: 0 });
  });

  it("displays height in whole cm or whole feet + inches", () => {
    expect(displayHeight(177.8, "metric")).toEqual({ cm: 178 });
    expect(displayHeight(177.8, "imperial")).toEqual({ feet: 5, inches: 10 });
  });
});
