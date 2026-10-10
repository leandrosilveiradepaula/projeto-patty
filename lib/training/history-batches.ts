/**
 * Training history grows with human publications and repeat requests.
 * Read each RLS-visible scope in bounded, complete pages. A failed read
 * cannot silently truncate a client's prescription or a professional list.
 */
export const TRAINING_HISTORY_ID_BATCH_SIZE = 100;
export const TRAINING_HISTORY_PAGE_SIZE = 500;

type TrainingHistoryPage<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

/** Complete a single authenticated ordered query, including an exact full page. */
export async function collectTrainingPagedRows<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<TrainingHistoryPage<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += TRAINING_HISTORY_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + TRAINING_HISTORY_PAGE_SIZE - 1);
    if (error) throw error;
    if (data === null) throw new Error("Training history query returned null rows.");
    rows.push(...data);
    if (data.length < TRAINING_HISTORY_PAGE_SIZE) break;
  }
  return rows;
}

/** Read all rows for bounded batches of already-authorized version IDs. */
export async function collectTrainingHistoryRows<Row>(
  versionIds: readonly string[],
  fetchPage: (
    ids: string[],
    from: number,
    to: number,
  ) => PromiseLike<TrainingHistoryPage<Row>>,
): Promise<Row[]> {
  const ids = [...new Set(versionIds)];
  const rows: Row[] = [];
  for (let start = 0; start < ids.length; start += TRAINING_HISTORY_ID_BATCH_SIZE) {
    const batch = ids.slice(start, start + TRAINING_HISTORY_ID_BATCH_SIZE);
    rows.push(...await collectTrainingPagedRows((from, to) => fetchPage(batch, from, to)));
  }
  return rows;
}
