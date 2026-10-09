/**
 * A missing page can hide a Patty pending task or an older client feedback.
 * Read all pages through the authenticated Supabase caller (never service role),
 * with small IN filters and stable ordering supplied by each query.
 */
export const CLIENT_OPERATIONAL_ID_BATCH_SIZE = 100;
export const CLIENT_OPERATIONAL_PAGE_SIZE = 500;

export async function collectScopedClientOperationalRows<Row>(
  ids: readonly string[],
  fetchPage: (
    scope: string[],
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
): Promise<Row[]> {
  const uniqueIds = [...new Set(ids)];
  const rows: Row[] = [];
  for (let offset = 0; offset < uniqueIds.length; offset += CLIENT_OPERATIONAL_ID_BATCH_SIZE) {
    const scope = uniqueIds.slice(offset, offset + CLIENT_OPERATIONAL_ID_BATCH_SIZE);
    for (let from = 0; ; from += CLIENT_OPERATIONAL_PAGE_SIZE) {
      const { data, error } = await fetchPage(
        scope,
        from,
        from + CLIENT_OPERATIONAL_PAGE_SIZE - 1,
      );
      if (error) throw error;
      if (data === null) throw new Error("Client operational query returned null rows");
      rows.push(...data);
      if (data.length < CLIENT_OPERATIONAL_PAGE_SIZE) break;
    }
  }
  return rows;
}
