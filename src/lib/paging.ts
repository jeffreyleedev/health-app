/**
 * Supabase returns at most 1,000 rows per request by default and cuts the
 * list off silently. fetchAllPages keeps asking for the next page until one
 * comes back short. Queries must have a stable order (e.g. date, id) so
 * pages don't overlap or skip rows.
 */

export const PAGE_SIZE = 1000;

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1); // inclusive range, like .range()
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}
