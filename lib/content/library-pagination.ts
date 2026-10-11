/**
 * Complete authenticated educational-library reads. PostgREST may cap rows,
 * including nested release history and per-version assets. Do not present a
 * partial page as the complete client-visible publication history.
 */
export const LIBRARY_PAGE_SIZE = 500;
export const LIBRARY_VERSION_BATCH_SIZE = 100;

export type LibraryQueryPage<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function collectLibraryPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<LibraryQueryPage<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += LIBRARY_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + LIBRARY_PAGE_SIZE - 1);
    if (error) throw error;
    if (data === null) throw new Error("Educational library read returned null rows");
    rows.push(...data);
    if (data.length < LIBRARY_PAGE_SIZE) break;
  }
  return rows;
}

export async function collectLibraryVersionRows<T>(
  versionIds: readonly string[],
  fetchPage: (ids: string[], from: number, to: number) => PromiseLike<LibraryQueryPage<T>>,
): Promise<T[]> {
  const ids = [...new Set(versionIds)];
  const rows: T[] = [];
  for (let offset = 0; offset < ids.length; offset += LIBRARY_VERSION_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + LIBRARY_VERSION_BATCH_SIZE);
    rows.push(...await collectLibraryPages((from, to) => fetchPage(batch, from, to)));
  }
  return rows;
}
