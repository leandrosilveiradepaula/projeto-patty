/**
 * Private file history must not silently stop at the PostgREST maximum row
 * count. The caller remains responsible for role and row authorization.
 * This helper only completes already-scoped, ordered reads.
 */
export const PRIVATE_FILE_PAGE_SIZE = 500;

type PrivateFilePage<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function collectPrivateFilePages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PrivateFilePage<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PRIVATE_FILE_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PRIVATE_FILE_PAGE_SIZE - 1);
    if (error) throw error;
    if (data === null) throw new Error("Private file history returned null rows");
    rows.push(...data);
    if (data.length < PRIVATE_FILE_PAGE_SIZE) break;
  }
  return rows;
}

/** Sort timestamps as actual instants, then IDs, across every page. */
export function orderPrivateFileHistory<T extends { id: string; created_at: string }>(rows: T[]): T[] {
  return rows.sort((left, right) => {
    const a = Date.parse(left.created_at);
    const b = Date.parse(right.created_at);
    const at = Number.isFinite(a) ? a : -Infinity;
    const bt = Number.isFinite(b) ? b : -Infinity;
    if (at !== bt) return bt - at;
    return left.id.localeCompare(right.id);
  });
}
