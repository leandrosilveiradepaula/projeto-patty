/**
 * All IDs are sourced from an authenticated, RLS-visible parent query.
 * PostgREST applies server-side row limits, so every level of the published
 * protocol tree must be both batched and paginated before assembling a plan.
 * Errors and unexpected null results must never masquerade as an empty plan.
 */
export const PUBLISHED_PROTOCOL_ID_BATCH_SIZE = 100;
export const PUBLISHED_PROTOCOL_PAGE_SIZE = 500;

export async function collectPublishedProtocolRows<Row>(
  parentIds: readonly string[],
  fetchPage: (
    scopedIds: string[],
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
): Promise<Row[]> {
  const uniqueIds = [...new Set(parentIds)];
  const rows: Row[] = [];

  for (let start = 0; start < uniqueIds.length; start += PUBLISHED_PROTOCOL_ID_BATCH_SIZE) {
    const scopedIds = uniqueIds.slice(start, start + PUBLISHED_PROTOCOL_ID_BATCH_SIZE);
    for (let from = 0; ; from += PUBLISHED_PROTOCOL_PAGE_SIZE) {
      const { data, error } = await fetchPage(
        scopedIds,
        from,
        from + PUBLISHED_PROTOCOL_PAGE_SIZE - 1,
      );
      if (error) throw error;
      if (data === null) {
        throw new Error("Published protocol query returned null rows without an error");
      }
      rows.push(...data);
      if (data.length < PUBLISHED_PROTOCOL_PAGE_SIZE) break;
    }
  }

  return rows;
}
