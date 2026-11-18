import { describe, expect, it } from "vitest";
import {
  addDays,
  dayOfWeekMondayFirst,
  formatDate,
  fromDayNumber,
  isValidDate,
  localDateString,
  startOfMonth,
  startOfNextMonth,
  startOfWeek,
  toDayNumber,
  todayUtc,
  yearsBefore,
} from "./dates";

describe("isValidDate", () => {
  it("accepts real dates, including leap days", () => {
    expect(isValidDate("2026-11-17")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true);
  });

  it("rejects impossible or malformed dates", () => {
    expect(isValidDate("2025-02-29")).toBe(false); // not a leap year
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-1-5")).toBe(false);
    expect(isValidDate("2026-11-17T10:00")).toBe(false);
  });
});

describe("day arithmetic", () => {
  it("round-trips through day numbers", () => {
    expect(toDayNumber("1970-01-01")).toBe(0);
    expect(fromDayNumber(toDayNumber("2026-11-17"))).toBe("2026-11-17");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });
});

describe("week boundaries (Monday–Sunday)", () => {
  it("numbers days with Monday = 0", () => {
    expect(dayOfWeekMondayFirst("2026-11-16")).toBe(0); // Monday
    expect(dayOfWeekMondayFirst("2026-11-22")).toBe(6); // Sunday
  });

  it("finds the Monday on or before a date", () => {
    expect(startOfWeek("2026-11-16")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-17")).toBe("2026-11-16");
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
  });
});

describe("todayUtc and yearsBefore", () => {
  it("reads today's UTC date from a given instant", () => {
    expect(todayUtc(new Date("2026-11-17T23:30:00Z"))).toBe("2026-11-17");
  });

  it("goes back whole years, handling Feb 29", () => {
    expect(yearsBefore("2026-11-17", 18)).toBe("2008-11-17");
    expect(yearsBefore("2024-02-29", 1)).toBe("2023-02-28");
  });
});

describe("month boundaries", () => {
  it("finds the first of the month and of the next month", () => {
    expect(startOfMonth("2026-11-17")).toBe("2026-11-01");
    expect(startOfNextMonth("2026-11-17")).toBe("2026-12-01");
    expect(startOfNextMonth("2026-12-05")).toBe("2027-01-01");
  });
});

describe("localDateString and formatDate", () => {
  it("uses the device's local calendar date, not UTC", () => {
    // Built from local parts, so this is 11:30 pm local time in any time zone.
    expect(localDateString(new Date(2026, 10, 17, 23, 30))).toBe("2026-11-17");
    expect(localDateString(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05");
  });

  it("formats dates the same way everywhere", () => {
    expect(formatDate("2026-11-17")).toBe("Nov 17, 2026");
    expect(formatDate("2024-02-09")).toBe("Feb 9, 2024");
  });
});
