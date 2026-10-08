/**
 * Training history grows with human publications. Read only the requested
 * version IDs, in bounded, complete pages, through the authenticated caller.
 * A failed read cannot silently truncate a client's published prescription.
 */
export const TRAINING_HISTORY_ID_BATCH_SIZE = 100;
export const TRAINING_HISTORY_PAGE_SIZE = 500;

export async function collectTrainingHistoryRows<Row>(
  versionIds: readonly string[],
  fetchPage: (
    ids: string[],
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
): Promise<Row[]> {
  const ids = [...new Set(versionIds)];
  const rows: Row[] = [];
  for (let start = 0; start < ids.length; start += TRAINING_HISTORY_ID_BATCH_SIZE) {
    const batch = ids.slice(start, start + TRAINING_HISTORY_ID_BATCH_SIZE);
    for (let from = 0; ; from += TRAINING_HISTORY_PAGE_SIZE) {
      const { data, error } = await fetchPage(batch, from, from + TRAINING_HISTORY_PAGE_SIZE - 1);
      if (error) throw error;
      if (data === null) throw new Error("Training history query returned null rows.");
      rows.push(...data);
      if (data.length < TRAINING_HISTORY_PAGE_SIZE) break;
    }
  }
  return rows;
}
