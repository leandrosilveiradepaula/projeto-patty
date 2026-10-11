/**
 * Authenticated AI execution history and internal findings are append-only.
 * Collect complete ordered pages and bounded sets of opaque IDs without
 * bypassing client-scoped RLS or exposing underlying model content.
 */
export const AI_HISTORY_PAGE_SIZE = 500;
export const AI_HISTORY_ID_BATCH_SIZE = 100;

type AiPage<Row> = { data: Row[] | null; error: { message: string } | null };

export async function collectAiPages<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<AiPage<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += AI_HISTORY_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + AI_HISTORY_PAGE_SIZE - 1);
    if (error) throw error;
    if (data === null) throw new Error("AI history query returned null rows");
    rows.push(...data);
    if (data.length < AI_HISTORY_PAGE_SIZE) return rows;
  }
}

export async function collectAiPagesForIds<Row>(
  ids: readonly string[],
  fetchPage: (ids: string[], from: number, to: number) => PromiseLike<AiPage<Row>>,
): Promise<Row[]> {
  const distinct = [...new Set(ids)];
  const rows: Row[] = [];
  for (let start = 0; start < distinct.length; start += AI_HISTORY_ID_BATCH_SIZE) {
    const batch = distinct.slice(start, start + AI_HISTORY_ID_BATCH_SIZE);
    rows.push(...await collectAiPages((from, to) => fetchPage(batch, from, to)));
  }
  return rows;
}

export function orderAiHistoryByCreatedAt<Row extends { id: string; created_at: string }>(
  rows: Row[],
  newestFirst: boolean,
): Row[] {
  return rows.sort((a, b) => {
    const aTime = Date.parse(a.created_at);
    const bTime = Date.parse(b.created_at);
    const at = Number.isFinite(aTime) ? aTime : -Infinity;
    const bt = Number.isFinite(bTime) ? bTime : -Infinity;
    return (newestFirst ? bt - at : at - bt) || a.id.localeCompare(b.id);
  });
}
