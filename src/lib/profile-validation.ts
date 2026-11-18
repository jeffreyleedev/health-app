/**
 * Validates the profile setup form and converts it to stored (metric) values.
 * Pure: no Supabase or Next.js imports, so it's unit tested directly.
 */

import { ageOn } from "./age";
import { compareDates, isValidDate, type DateString } from "./dates";
import { ACTIVITY_LEVELS, type ActivityLevel, type Sex } from "./formulas";
import { cmToFeetInches, heightInputToCm, roundTo, type UnitSystem } from "./units";

export const MIN_AGE_YEARS = 18;
export const MAX_AGE_YEARS = 120;
export const MIN_HEIGHT_CM = 100;
export const MAX_HEIGHT_CM = 250;
export const MAX_NAME_LENGTH = 50;

/** A profile ready to save, in stored units. The user id is added by the data layer. */
export interface ProfileInput {
  /** Optional; null means no name (the app shows the email instead). */
  displayName: string | null;
  birthdate: DateString;
  sex: Sex;
  heightCm: number;
  activityLevel: ActivityLevel;
  unitSystem: UnitSystem;
}

export type ProfileField = "displayName" | "unitSystem" | "birthdate" | "sex" | "height" | "activityLevel";

export type ProfileParseResult =
  { ok: true; value: ProfileInput } | { ok: false; errors: Partial<Record<ProfileField, string>> };

/** Raw form values, as strings (missing fields are undefined). */
export type ProfileFormValues = Partial<
  Record<
    "displayName" | "unitSystem" | "birthdate" | "sex" | "heightCm" | "heightFt" | "heightIn" | "activityLevel",
    string
  >
>;

function isActivityLevel(v: string | undefined): v is ActivityLevel {
  return v !== undefined && Object.hasOwn(ACTIVITY_LEVELS, v);
}

/** Parses a non-negative decimal number; returns null for anything else. */
function parseNumber(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Optional display name. Trimmed; blank means no name. Mirrors the database
 * rule in 0003_display_name.sql: 1–50 characters, no control characters.
 */
export function parseDisplayName(
  raw: string | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const name = (raw ?? "").trim();
  if (name === "") return { ok: true, value: null };
  if (/\p{Cc}/u.test(name)) return { ok: false, error: "Use letters, spaces, and punctuation only." };
  // Count characters the way Postgres does (code points, so "é" or an emoji counts once).
  if ([...name].length > MAX_NAME_LENGTH) return { ok: false, error: `Use ${MAX_NAME_LENGTH} characters or fewer.` };
  return { ok: true, value: name };
}

export function parseProfileForm(values: ProfileFormValues, today: DateString): ProfileParseResult {
  const errors: Partial<Record<ProfileField, string>> = {};

  const displayName = parseDisplayName(values.displayName);
  if (!displayName.ok) errors.displayName = displayName.error;

  const unitSystem = values.unitSystem;
  if (unitSystem !== "metric" && unitSystem !== "imperial") {
    errors.unitSystem = "Choose metric or imperial.";
  }

  const birthdate = values.birthdate ?? "";
  if (!isValidDate(birthdate)) {
    errors.birthdate = "Enter your date of birth.";
  } else if (compareDates(birthdate, today) > 0) {
    errors.birthdate = "Date of birth can't be in the future.";
  } else {
    const age = ageOn(birthdate, today);
    if (age < MIN_AGE_YEARS) errors.birthdate = `You must be at least ${MIN_AGE_YEARS} to use this app.`;
    else if (age > MAX_AGE_YEARS) errors.birthdate = "Check your date of birth.";
  }

  const sex = values.sex;
  if (sex !== "male" && sex !== "female") errors.sex = "Choose male or female.";

  const activityLevel = values.activityLevel;
  if (!isActivityLevel(activityLevel)) errors.activityLevel = "Choose an activity level.";

  let heightCm: number | null = null;
  if (unitSystem === "metric") {
    const cm = parseNumber(values.heightCm);
    heightCm = cm === null ? null : heightInputToCm({ cm });
  } else if (unitSystem === "imperial") {
    const ft = parseNumber(values.heightFt);
    // A blank inches box means 0 (e.g. exactly 6 ft).
    const inches = values.heightIn?.trim() ? parseNumber(values.heightIn) : 0;
    const wholeFeet = ft !== null && Number.isInteger(ft);
    const validInches = inches !== null && inches < 12;
    heightCm = wholeFeet && validInches ? heightInputToCm({ feet: ft, inches }) : null;
  }
  if (unitSystem === "metric" || unitSystem === "imperial") {
    if (heightCm === null) {
      errors.height = unitSystem === "metric" ? "Enter your height in cm." : "Enter whole feet and 0–11 inches.";
    } else if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
      errors.height =
        unitSystem === "metric"
          ? `Height must be between ${MIN_HEIGHT_CM} and ${MAX_HEIGHT_CM} cm.`
          : "Height must be between about 3 ft 4 in and 8 ft 2 in.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      displayName: displayName.ok ? displayName.value : null,
      birthdate,
      sex: sex as Sex,
      heightCm: heightCm as number,
      activityLevel: activityLevel as ActivityLevel,
      unitSystem: unitSystem as UnitSystem,
    },
  };
}

export type HeightBoxes = { heightCm: string } | { heightFt: string; heightIn: string };

/** What the height boxes show for a stored height: cm to 0.1, or whole ft + in. */
export function heightBoxesFor(cm: number, unitSystem: UnitSystem): HeightBoxes {
  if (unitSystem === "metric") return { heightCm: String(roundTo(cm, 1)) };
  const { feet, inches } = cmToFeetInches(cm);
  return { heightFt: String(feet), heightIn: String(inches) };
}

/**
 * True if the submitted height is just the stored height as the boxes show
 * it (untouched, or the units switched without editing). Then the stored cm
 * is kept exactly instead of re-converting a rounded number:
 * 172.46 cm shows as 5 ft 8 in, which would re-save as 172.72 cm.
 */
export function keepStoredHeight(values: ProfileFormValues, storedCm: number): boolean {
  const num = (v: string | undefined, blankAsZero = false) =>
    v === undefined || v.trim() === "" ? (blankAsZero ? 0 : NaN) : Number(v);
  if (values.unitSystem === "metric") return num(values.heightCm) === roundTo(storedCm, 1);
  if (values.unitSystem === "imperial") {
    const { feet, inches } = cmToFeetInches(storedCm);
    return num(values.heightFt) === feet && num(values.heightIn, true) === inches;
  }
  return false;
}
