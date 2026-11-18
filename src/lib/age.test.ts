import { describe, expect, it } from "vitest";
import { ageOn } from "./age";

describe("ageOn", () => {
  it("counts a birthday only once it has been reached", () => {
    expect(ageOn("1990-11-18", "2026-11-17")).toBe(35); // day before birthday
    expect(ageOn("1990-11-18", "2026-11-18")).toBe(36); // on the birthday
  });

  it("handles a Feb 29 birthday in a non-leap year", () => {
    expect(ageOn("2000-02-29", "2025-02-28")).toBe(24);
    expect(ageOn("2000-02-29", "2025-03-01")).toBe(25);
  });

  it("rejects a birthdate in the future", () => {
    expect(() => ageOn("2030-01-01", "2026-11-17")).toThrow(RangeError);
  });
});
