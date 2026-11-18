import { describe, expect, it } from "vitest";
import {
  formatPeriod,
  groupHistory,
  historyFetchStart,
  recentHistory,
  windowStart,
  type CalorieEntry,
  type WeighIn,
} from "./history";

// The week of Mon 2026-11-16 to Sun 2026-11-22, then an empty week,
// then one entry in the week of Mon 2026-11-30.
const weighIns: WeighIn[] = [
  { date: "2026-11-16", weightKg: 82 },
  { date: "2026-11-18", weightKg: 81 },
  { date: "2026-11-21", weightKg: 80 },
  { date: "2026-12-01", weightKg: 79 },
];

const calories: CalorieEntry[] = [
  { date: "2026-11-16", calories: 500 }, // breakfast
  { date: "2026-11-16", calories: 1500 }, // dinner — same day, summed to 2000
  { date: "2026-11-17", calories: 2200 },
  { date: "2026-11-18", calories: 1800 },
  { date: "2026-11-20", calories: 2100 },
  { date: "2026-11-22", calories: 1900 },
  // 11-19 and 11-21 not logged
];

describe("groupHistory — weekly", () => {
  const weeks = groupHistory(weighIns, calories, "weekly");

  it("creates one period per Monday–Sunday week, including empty ones", () => {
    expect(weeks.map((w) => [w.start, w.end])).toEqual([
      ["2026-11-16", "2026-11-22"],
      ["2026-11-23", "2026-11-29"],
      ["2026-11-30", "2026-12-06"],
    ]);
  });

  it("averages weigh-ins in the week", () => {
    expect(weeks[0].averageWeightKg).toBe(81);
    expect(weeks[0].weighInCount).toBe(3);
  });

  it("sums same-day calories, then averages over logged days only", () => {
    // daily totals: 2000, 2200, 1800, 2100, 1900 → 10000 / 5 days
    expect(weeks[0].averageDailyCalories).toBe(2000);
    expect(weeks[0].loggedCalorieDays).toBe(5);
  });

  it("shows empty weeks with nulls instead of zeros", () => {
    expect(weeks[1]).toMatchObject({
      averageWeightKg: null,
      weighInCount: 0,
      averageDailyCalories: null,
      loggedCalorieDays: 0,
    });
  });

  it("allows a week with a weigh-in but no calories", () => {
    expect(weeks[2].averageWeightKg).toBe(79);
    expect(weeks[2].averageDailyCalories).toBeNull();
  });
});

describe("groupHistory — other cadences", () => {
  it("daily: one period per day, same-day calories summed", () => {
    const days = groupHistory(weighIns, calories, "daily");
    expect(days[0]).toMatchObject({ start: "2026-11-16", end: "2026-11-16", averageDailyCalories: 2000 });
    expect(days).toHaveLength(16); // 2026-11-16 through 2026-12-01
  });

  it("bi-weekly: 14-day blocks from the fixed anchor", () => {
    const blocks = groupHistory(weighIns, calories, "biweekly");
    // 2026-11-16 is 1050 days (75 blocks) after 2024-01-01, so it starts a block.
    expect(blocks.map((b) => [b.start, b.end])).toEqual([
      ["2026-11-16", "2026-11-29"],
      ["2026-11-30", "2026-12-13"],
    ]);
  });

  it("monthly: calendar months", () => {
    const months = groupHistory(weighIns, calories, "monthly");
    expect(months.map((m) => [m.start, m.end])).toEqual([
      ["2026-11-01", "2026-11-30"],
      ["2026-12-01", "2026-12-31"],
    ]);
    expect(months[0].averageWeightKg).toBe(81);
    expect(months[1].averageWeightKg).toBe(79);
  });

  it("monthly: February in a leap year ends on the 29th", () => {
    const months = groupHistory([{ date: "2024-02-10", weightKg: 70 }], [], "monthly");
    expect(months[0].end).toBe("2024-02-29");
  });

  it("returns nothing when there are no entries", () => {
    expect(groupHistory([], [], "weekly")).toEqual([]);
  });
});

describe("recentHistory — last 12 periods ending today", () => {
  const TODAY = "2026-11-17"; // a Tuesday

  it("ends at the week containing today, with exactly 12 weeks", () => {
    const periods = recentHistory(weighIns, [], "weekly", TODAY, 12);
    expect(periods).toHaveLength(12);
    expect(periods[11].start).toBe("2026-11-16");
    expect(periods[11].end).toBe("2026-11-22");
    expect(periods[0].start).toBe("2026-08-31"); // 11 weeks earlier
  });

  it("keeps empty periods and ignores entries after the window", () => {
    const periods = recentHistory(weighIns, [], "weekly", TODAY, 12);
    expect(periods[10]).toMatchObject({ averageWeightKg: null, weighInCount: 0 });
    // Nov 16, 18, 21 are in today's week; Dec 1 is after it and not shown.
    expect(periods[11]).toMatchObject({ averageWeightKg: 81, weighInCount: 3 });
  });

  it("still shows 12 periods when there's no recent data", () => {
    const periods = recentHistory(weighIns, [], "daily", "2027-06-01", 12);
    expect(periods).toHaveLength(12);
    expect(periods.every((p) => p.weighInCount === 0)).toBe(true);
  });

  it("drops entries older than the window", () => {
    const old: WeighIn[] = [{ date: "2015-03-01", weightKg: 95 }, ...weighIns];
    const periods = recentHistory(old, [], "monthly", TODAY, 12);
    expect(periods.reduce((n, p) => n + p.weighInCount, 0)).toBe(3); // the three November weigh-ins
  });

  it("walks back by calendar months across a year boundary", () => {
    expect(windowStart("2026-03-15", "monthly", 12)).toBe("2025-04-01");
    const periods = recentHistory([], [], "monthly", "2026-03-15", 12);
    expect(periods.map((p) => p.start).slice(-4)).toEqual(["2025-12-01", "2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(periods[9].end).toBe("2026-01-31");
    expect(periods[10].end).toBe("2026-02-28");
  });

  it("uses the fixed bi-weekly blocks", () => {
    // 2026-11-16 is block-aligned: 1050 days (75 blocks) after 2024-01-01.
    expect(windowStart(TODAY, "biweekly", 12)).toBe("2026-06-15"); // 11 blocks (154 days) before Nov 16
  });
});

describe("historyFetchStart", () => {
  it("covers every cadence's window, even for someone a day behind UTC", () => {
    // UTC today is Dec 1; someone in UTC−12 may still be on Nov 30,
    // whose monthly window starts Dec 1 of the previous year.
    expect(historyFetchStart("2026-12-01")).toBe("2025-12-01");
    for (const localToday of ["2026-11-30", "2026-12-01", "2026-12-02"]) {
      for (const cadence of ["daily", "weekly", "biweekly", "monthly"] as const) {
        expect(windowStart(localToday, cadence, 12) >= "2025-12-01").toBe(true);
      }
    }
  });
});

describe("formatPeriod", () => {
  it("labels each cadence", () => {
    expect(formatPeriod({ start: "2026-11-17", end: "2026-11-17" }, "daily")).toBe("Nov 17, 2026");
    expect(formatPeriod({ start: "2026-11-16", end: "2026-11-22" }, "weekly")).toBe("Nov 16–22, 2026");
    expect(formatPeriod({ start: "2026-11-30", end: "2026-12-06" }, "weekly")).toBe("Nov 30 – Dec 6, 2026");
    expect(formatPeriod({ start: "2025-12-29", end: "2026-01-11" }, "biweekly")).toBe("Dec 29, 2025 – Jan 11, 2026");
    expect(formatPeriod({ start: "2026-11-01", end: "2026-11-30" }, "monthly")).toBe("Nov 2026");
  });
});
