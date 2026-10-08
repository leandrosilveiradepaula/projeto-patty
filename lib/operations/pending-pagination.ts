/**
 * Bound PostgREST URL size and response size when gathering an administrative
 * queue. Each page is read through the caller's authenticated, RLS-scoped
 * Supabase client. A partially loaded queue must fail closed, not look empty.
 */
export const PENDING_ID_BATCH_SIZE = 100;
export const PENDING_PAGE_SIZE = 500;

export type PendingPage<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
};

export async function collectScopedPendingRows<Row>(
  ids: readonly string[],
  fetchPage: (
    batch: string[],
    from: number,
    to: number,
  ) => PromiseLike<PendingPage<Row>>,
): Promise<Row[]> {
  const uniqueIds = [...new Set(ids)];
  const rows: Row[] = [];

  for (let start = 0; start < uniqueIds.length; start += PENDING_ID_BATCH_SIZE) {
    const batch = uniqueIds.slice(start, start + PENDING_ID_BATCH_SIZE);

    for (let from = 0; ; from += PENDING_PAGE_SIZE) {
      const { data, error } = await fetchPage(
        batch,
        from,
        from + PENDING_PAGE_SIZE - 1,
      );
      if (error) throw error;
      if (data === null) {
        throw new Error("A leitura da fila retornou dados nulos sem erro.");
      }
      rows.push(...data);
      if (data.length < PENDING_PAGE_SIZE) break;
    }
  }

  return rows;
}
