/**
 * Check-in facts and corrections are append-only. Complete paged reads prevent
 * an omitted original event or late correction from changing the displayed
 * factual total. All callers supply their own authenticated, RLS-scoped query.
 */
export const CHECKIN_HISTORY_PAGE_SIZE = 500;
export const CHECKIN_CORRECTION_ID_BATCH_SIZE = 100;

type ReadPage<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

export async function collectCheckinHistoryPages<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<ReadPage<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += CHECKIN_HISTORY_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + CHECKIN_HISTORY_PAGE_SIZE - 1);
    if (error) throw error;
    if (data === null) throw new Error("Check-in history returned null rows");
    rows.push(...data);
    if (data.length < CHECKIN_HISTORY_PAGE_SIZE) break;
  }
  return rows;
}

export async function collectCheckinCorrectionRows<Row>(
  eventIds: readonly string[],
  fetchPage: (ids: string[], from: number, to: number) => PromiseLike<ReadPage<Row>>,
): Promise<Row[]> {
  const ids = [...new Set(eventIds)];
  const rows: Row[] = [];
  for (let offset = 0; offset < ids.length; offset += CHECKIN_CORRECTION_ID_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + CHECKIN_CORRECTION_ID_BATCH_SIZE);
    rows.push(...await collectCheckinHistoryPages((from, to) => fetchPage(batch, from, to)));
  }
  return rows;
}

/** Invalid historical timestamps must never outrank valid event history. */
export function newestFirstByInstant<Row extends { id: string }>(
  rows: Row[],
  getTimestamp: (row: Row) => string,
): Row[] {
  return rows.sort((a, b) => {
    const at = Date.parse(getTimestamp(a));
    const bt = Date.parse(getTimestamp(b));
    const first = Number.isFinite(at) ? at : -Infinity;
    const second = Number.isFinite(bt) ? bt : -Infinity;
    return second - first || b.id.localeCompare(a.id);
  });
}
