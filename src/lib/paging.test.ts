import { describe, expect, it } from "vitest";
import { fetchAllPages } from "./paging";

/** A fake table of `total` rows that, like Supabase, returns at most 1,000 per request. */
function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => i);
  const requests: Array<[number, number]> = [];
  const fetchPage = async (from: number, to: number) => {
    requests.push([from, to]);
    return rows.slice(from, Math.min(to + 1, from + 1000));
  };
  return { rows, requests, fetchPage };
}

describe("fetchAllPages", () => {
  it("gets every row past the 1,000-row cap", async () => {
    const t = fakeTable(2500);
    expect(await fetchAllPages(t.fetchPage)).toEqual(t.rows);
    expect(t.requests).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("asks once more when the last page is exactly full", async () => {
    const t = fakeTable(1000);
    expect((await fetchAllPages(t.fetchPage)).length).toBe(1000);
    expect(t.requests.length).toBe(2); // the second, empty page proves there's no more
  });

  it("handles small and empty tables in one request", async () => {
    const small = fakeTable(3);
    expect(await fetchAllPages(small.fetchPage)).toEqual([0, 1, 2]);
    expect(small.requests.length).toBe(1);
    expect(await fetchAllPages(fakeTable(0).fetchPage)).toEqual([]);
  });
});
