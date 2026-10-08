/**
 * Authenticated, RLS-scoped Anamnesis histories can exceed PostgREST's
 * implicit result cap. Bound the IN-filter size and read each complete page.
 * A failed or null response must not be mistaken for an empty history.
 */
export const ANAMNESIS_HISTORY_ID_BATCH_SIZE = 100;
export const ANAMNESIS_HISTORY_PAGE_SIZE = 500;

export async function collectAnamnesisHistoryRows<Row>(
  ids: readonly string[],
  fetchPage: (
    scopedIds: string[],
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
): Promise<Row[]> {
  const uniqueIds = [...new Set(ids)];
  const rows: Row[] = [];
  for (let i = 0; i < uniqueIds.length; i += ANAMNESIS_HISTORY_ID_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + ANAMNESIS_HISTORY_ID_BATCH_SIZE);
    for (let from = 0; ; from += ANAMNESIS_HISTORY_PAGE_SIZE) {
      const { data, error } = await fetchPage(
        batch,
        from,
        from + ANAMNESIS_HISTORY_PAGE_SIZE - 1,
      );
      if (error) throw error;
      if (data === null) {
        throw new Error("Anamnesis history query returned null rows without error");
      }
      rows.push(...data);
      if (data.length < ANAMNESIS_HISTORY_PAGE_SIZE) break;
    }
  }
  return rows;
}
