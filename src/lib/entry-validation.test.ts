import { describe, expect, it } from "vitest";
import { entryDateLimits, parseCalorieForm, parseEntryDate, parseEntryId, parseWeighInForm } from "./entry-validation";

const BIRTHDATE = "1990-11-18";
const TODAY_UTC = "2026-11-17";
const limits = entryDateLimits(BIRTHDATE, TODAY_UTC);

function errors<T>(r: { ok: true; value: T } | { ok: false; errors: Record<string, string | undefined> }) {
  if (r.ok) throw new Error("expected errors");
  return r.errors;
}

describe("entry date limits", () => {
  it("run from the birthdate to UTC today + 1 day", () => {
    expect(limits).toEqual({ earliest: "1990-11-18", latest: "2026-11-18" });
  });

  it("accept UTC tomorrow (someone in UTC+14 is already there) but not the day after", () => {
    expect(parseWeighInForm({ date: "2026-11-18", weight: "180" }, "imperial", limits).ok).toBe(true);
    expect(errors(parseWeighInForm({ date: "2026-11-19", weight: "180" }, "imperial", limits)).date).toMatch(/future/);
  });

  it("accept the birthdate itself but not the day before", () => {
    expect(parseCalorieForm({ date: "1990-11-18", calories: "2000" }, limits).ok).toBe(true);
    expect(errors(parseCalorieForm({ date: "1990-11-17", calories: "2000" }, limits)).date).toMatch(/birth/);
  });

  it("reject missing and impossible dates", () => {
    expect(errors(parseCalorieForm({ calories: "2000" }, limits)).date).toBeDefined();
    expect(errors(parseCalorieForm({ date: "2026-02-30", calories: "2000" }, limits)).date).toBeDefined();
  });
});

describe("parseWeighInForm", () => {
  it("converts pounds to kg for storage", () => {
    expect(parseWeighInForm({ date: "2026-11-17", weight: "180" }, "imperial", limits)).toEqual({
      ok: true,
      value: { date: "2026-11-17", weightKg: 81.65 },
    });
  });

  it("keeps kg as entered (2 decimals)", () => {
    const r = parseWeighInForm({ date: "2026-11-17", weight: " 72.456 " }, "metric", limits);
    expect(r.ok && r.value.weightKg).toBe(72.46);
  });

  it("checks the 25–400 kg range after converting", () => {
    expect(parseWeighInForm({ date: "2026-11-17", weight: "25" }, "metric", limits).ok).toBe(true);
    expect(parseWeighInForm({ date: "2026-11-17", weight: "400" }, "metric", limits).ok).toBe(true);
    expect(errors(parseWeighInForm({ date: "2026-11-17", weight: "24.9" }, "metric", limits)).weight).toMatch(/25 and 400 kg/);
    // 1800 lb is a typo for 180 — about 816 kg.
    expect(errors(parseWeighInForm({ date: "2026-11-17", weight: "1800" }, "imperial", limits)).weight).toMatch(/56 and 881 lb/);
    // The pound limits in the message are themselves accepted.
    expect(parseWeighInForm({ date: "2026-11-17", weight: "56" }, "imperial", limits).ok).toBe(true);
    expect(parseWeighInForm({ date: "2026-11-17", weight: "881" }, "imperial", limits).ok).toBe(true);
  });

  it("rejects blank, zero, negative, and non-numeric weights", () => {
    for (const weight of ["", "0", "-150", "abc"]) {
      expect(errors(parseWeighInForm({ date: "2026-11-17", weight }, "imperial", limits)).weight).toMatch(/lb/);
    }
  });

  it("returns only the stored fields, ignoring anything extra", () => {
    const values = { date: "2026-11-17", weight: "180", ...({ ownerId: "someone-else" } as object) };
    const r = parseWeighInForm(values, "imperial", limits);
    expect(r.ok && Object.keys(r.value).sort()).toEqual(["date", "weightKg"]);
  });
});

describe("parseCalorieForm", () => {
  it("accepts whole numbers from 0 to 10,000", () => {
    expect(parseCalorieForm({ date: "2026-11-17", calories: "0" }, limits)).toEqual({
      ok: true,
      value: { date: "2026-11-17", calories: 0 },
    });
    expect(parseCalorieForm({ date: "2026-11-17", calories: "10000" }, limits).ok).toBe(true);
  });

  it("rejects too many, fractional, negative, and non-numeric calories", () => {
    expect(errors(parseCalorieForm({ date: "2026-11-17", calories: "10001" }, limits)).calories).toMatch(/10,000/);
    for (const calories of ["", "1.5", "-5", "1e3", "lots"]) {
      expect(errors(parseCalorieForm({ date: "2026-11-17", calories }, limits)).calories).toMatch(/whole number/);
    }
  });
});

describe("parseEntryId", () => {
  it("accepts positive whole numbers", () => {
    expect(parseEntryId("1")).toBe(1);
    expect(parseEntryId("4821")).toBe(4821);
  });

  it("rejects anything else before it reaches a query", () => {
    for (const raw of [undefined, "", "0", "-1", "1.5", "abc", "1 or 1=1", " 7", "007", "1e3", "99999999999999999999"]) {
      expect(parseEntryId(raw)).toBeNull();
    }
  });
});

describe("Undo re-saves stored kg exactly", () => {
  it("treats the stored kg as a metric weight, so imperial users don't drift", () => {
    // 79.83 kg shows as 176.0 lb; re-saving "176.0" lb would give 79.83 here,
    // but values like 72.46 kg (159.7 lb) would drift to 72.44 through pounds.
    const r = parseWeighInForm({ date: "2026-11-17", weight: "72.46" }, "metric", limits);
    expect(r.ok && r.value.weightKg).toBe(72.46);
  });
});

describe("parseEntryDate (date-only edits)", () => {
  it("uses the same limits as logging", () => {
    expect(parseEntryDate("2026-11-18", limits)).toEqual({ ok: true, date: "2026-11-18" });
    expect(parseEntryDate("2026-11-19", limits)).toMatchObject({ ok: false });
    expect(parseEntryDate("1990-11-17", limits)).toMatchObject({ ok: false });
    expect(parseEntryDate(undefined, limits)).toMatchObject({ ok: false });
  });
});
