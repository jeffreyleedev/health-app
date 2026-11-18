import { describe, expect, it } from "vitest";
import {
  heightBoxesFor,
  keepStoredHeight,
  parseDisplayName,
  parseProfileForm,
  type ProfileFormValues,
} from "./profile-validation";

const TODAY = "2026-11-17";
const base: ProfileFormValues = {
  unitSystem: "imperial",
  birthdate: "1990-11-18",
  sex: "male",
  heightFt: "5",
  heightIn: "10",
  activityLevel: "moderatelyActive",
};

describe("parseProfileForm — valid input", () => {
  it("converts imperial height to cm for storage", () => {
    expect(parseProfileForm(base, TODAY)).toEqual({
      ok: true,
      value: {
        displayName: null,
        birthdate: "1990-11-18",
        sex: "male",
        heightCm: 177.8,
        activityLevel: "moderatelyActive",
        unitSystem: "imperial",
      },
    });
  });

  it("treats a blank inches box as 0", () => {
    const r = parseProfileForm({ ...base, heightFt: "6", heightIn: "" }, TODAY);
    expect(r.ok && r.value.heightCm).toBe(182.88);
  });

  it("keeps metric height as entered (2 decimals)", () => {
    const r = parseProfileForm(
      { ...base, unitSystem: "metric", heightCm: "172.456", heightFt: undefined, heightIn: undefined },
      TODAY,
    );
    expect(r.ok && r.value.heightCm).toBe(172.46);
  });

  it("accepts someone turning 18 today", () => {
    expect(parseProfileForm({ ...base, birthdate: "2008-11-17" }, TODAY).ok).toBe(true);
  });
});

describe("parseProfileForm — rejected input", () => {
  const errorsFor = (values: ProfileFormValues) => {
    const r = parseProfileForm(values, TODAY);
    if (r.ok) throw new Error("expected errors");
    return r.errors;
  };

  it("requires a unit choice, sex, and a known activity level", () => {
    const e = errorsFor({ ...base, unitSystem: "furlongs", sex: "other", activityLevel: "lazy" });
    expect(Object.keys(e).sort()).toEqual(["activityLevel", "sex", "unitSystem"]);
  });

  it("rejects under-18s, the day before their 18th birthday", () => {
    expect(errorsFor({ ...base, birthdate: "2008-11-18" }).birthdate).toMatch(/at least 18/);
  });

  it("rejects future, impossible, and implausibly old birthdates", () => {
    expect(errorsFor({ ...base, birthdate: "2027-01-01" }).birthdate).toMatch(/future/);
    expect(errorsFor({ ...base, birthdate: "1990-02-30" }).birthdate).toBeDefined();
    expect(errorsFor({ ...base, birthdate: "1900-01-01" }).birthdate).toMatch(/Check/);
  });

  it("rejects heights outside 100–250 cm", () => {
    expect(errorsFor({ ...base, unitSystem: "metric", heightCm: "17.8" }).height).toMatch(/between/);
    expect(errorsFor({ ...base, unitSystem: "metric", heightCm: "251" }).height).toMatch(/between/);
    expect(errorsFor({ ...base, heightFt: "2", heightIn: "0" }).height).toMatch(/between/);
  });

  it("rejects malformed imperial height", () => {
    expect(errorsFor({ ...base, heightFt: "5.5" }).height).toBeDefined(); // feet must be whole
    expect(errorsFor({ ...base, heightIn: "12" }).height).toBeDefined(); // 12 in is a foot
    expect(errorsFor({ ...base, heightFt: "" }).height).toBeDefined();
    expect(errorsFor({ ...base, heightIn: "-1" }).height).toBeDefined();
  });

  it("ignores fields an attacker adds, like a user id", () => {
    const r = parseProfileForm({ ...base, ...({ userId: "someone-else" } as object) }, TODAY);
    expect(r.ok && Object.keys(r.value).sort()).toEqual([
      "activityLevel",
      "birthdate",
      "displayName",
      "heightCm",
      "sex",
      "unitSystem",
    ]);
  });
});

describe("keepStoredHeight (settings)", () => {
  const STORED = 172.46; // shows as 172.5 cm or 5 ft 8 in

  it("shows the stored height in either unit", () => {
    expect(heightBoxesFor(STORED, "metric")).toEqual({ heightCm: "172.5" });
    expect(heightBoxesFor(STORED, "imperial")).toEqual({ heightFt: "5", heightIn: "8" });
  });

  it("keeps the stored cm when the boxes are untouched, in either unit", () => {
    expect(keepStoredHeight({ unitSystem: "imperial", heightFt: "5", heightIn: "8" }, STORED)).toBe(true);
    expect(keepStoredHeight({ unitSystem: "metric", heightCm: "172.5" }, STORED)).toBe(true);
    // Re-converting 5 ft 8 in would have saved 172.72 cm instead.
    const r = parseProfileForm({ ...base, heightFt: "5", heightIn: "8" }, TODAY);
    expect(r.ok && r.value.heightCm).toBe(172.72);
  });

  it("treats a blank inches box as 0", () => {
    expect(keepStoredHeight({ unitSystem: "imperial", heightFt: "6", heightIn: "" }, 182.88)).toBe(true);
  });

  it("notices a real change", () => {
    expect(keepStoredHeight({ unitSystem: "imperial", heightFt: "5", heightIn: "9" }, STORED)).toBe(false);
    expect(keepStoredHeight({ unitSystem: "metric", heightCm: "175" }, STORED)).toBe(false);
    expect(keepStoredHeight({ unitSystem: "metric", heightCm: "" }, STORED)).toBe(false);
  });
});

describe("parseDisplayName", () => {
  it("trims, and treats blank as no name", () => {
    expect(parseDisplayName("  Jeffrey Lee  ")).toEqual({ ok: true, value: "Jeffrey Lee" });
    expect(parseDisplayName("   ")).toEqual({ ok: true, value: null });
    expect(parseDisplayName(undefined)).toEqual({ ok: true, value: null });
  });

  it("allows up to 50 characters, counting accents and emoji once", () => {
    expect(parseDisplayName("a".repeat(50)).ok).toBe(true);
    expect(parseDisplayName("a".repeat(51)).ok).toBe(false);
    expect(parseDisplayName("é".repeat(50)).ok).toBe(true);
    expect(parseDisplayName("😀".repeat(50)).ok).toBe(true); // 100 UTF-16 units, 50 characters
  });

  it("rejects control characters inside the name", () => {
    expect(parseDisplayName("Jeff\nLee").ok).toBe(false);
    expect(parseDisplayName("Jeff\tLee").ok).toBe(false);
    expect(parseDisplayName("Jeff\u0000Lee").ok).toBe(false);
  });

  it("is part of the profile form", () => {
    const r = parseProfileForm({ ...base, displayName: " Jeffrey Lee " }, TODAY);
    expect(r.ok && r.value.displayName).toBe("Jeffrey Lee");
    const bad = parseProfileForm({ ...base, displayName: "x".repeat(51) }, TODAY);
    expect(!bad.ok && bad.errors.displayName).toMatch(/50/);
  });
});
