/**
 * Unit conversion and display rounding.
 *
 * Everything is stored in metric (kg, cm). The frontend converts imperial
 * input to metric before sending it, and converts stored metric values to
 * the user's preferred units for display. Rounding for display happens
 * only at the last step; stored values keep 2 decimal places.
 */

export type UnitSystem = "metric" | "imperial";

/** Exact by international definition. */
export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;
export const INCHES_PER_FOOT = 12;

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

/**
 * Converts cm to whole feet + whole inches. Rounds the total inches first,
 * so 179.9 cm becomes 5 ft 11 in rather than an impossible 5 ft 12 in.
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  };
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Precision used when saving kg/cm, so a round trip doesn't drift. */
export const STORAGE_DECIMALS = 2;

export function roundForStorage(value: number): number {
  return roundTo(value, STORAGE_DECIMALS);
}

/** Converts a weight typed in the user's units to kg, ready to store. */
export function weightInputToKg(value: number, system: UnitSystem): number {
  return roundForStorage(system === "metric" ? value : lbToKg(value));
}

/** Converts a height typed in the user's units to cm, ready to store. */
export function heightInputToCm(input: { cm: number } | { feet: number; inches: number }): number {
  const cm = "cm" in input ? input.cm : feetInchesToCm(input.feet, input.inches);
  return roundForStorage(cm);
}

/** Stored kg -> number to display in the user's units, rounded to 0.1. */
export function displayWeight(kg: number, system: UnitSystem): { value: number; unit: "kg" | "lb" } {
  return system === "metric" ? { value: roundTo(kg, 1), unit: "kg" } : { value: roundTo(kgToLb(kg), 1), unit: "lb" };
}

/** Stored cm -> whole cm, or whole feet + inches. */
export function displayHeight(cm: number, system: UnitSystem): { cm: number } | { feet: number; inches: number } {
  return system === "metric" ? { cm: Math.round(cm) } : cmToFeetInches(cm);
}
