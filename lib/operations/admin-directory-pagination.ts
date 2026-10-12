/** Complete ordered administrative lists without bypassing authenticated RLS. */
export const ADMIN_DIRECTORY_PAGE_SIZE = 500;
export async function collectAdminDirectoryPages<T>(
  read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += ADMIN_DIRECTORY_PAGE_SIZE) {
    const { data, error } = await read(from, from + ADMIN_DIRECTORY_PAGE_SIZE - 1);
    if (error) throw error;
    if (data === null) throw new Error("Administrative directory returned null rows");
    rows.push(...data);
    if (data.length < ADMIN_DIRECTORY_PAGE_SIZE) return rows;
  }
}
export function orderAdminRecords<T extends { id: string }>(
  rows: T[],
  timestamp: (row: T) => string,
  newestFirst = true,
): T[] {
  return rows.sort((a, b) => {
    const aTime = Date.parse(timestamp(a));
    const bTime = Date.parse(timestamp(b));
    const left = Number.isFinite(aTime) ? aTime : -Infinity;
    const right = Number.isFinite(bTime) ? bTime : -Infinity;
    if (left === -Infinity || right === -Infinity) return left === -Infinity ? (right === -Infinity ? a.id.localeCompare(b.id) : 1) : -1;
    return (newestFirst ? right - left : left - right) || a.id.localeCompare(b.id);
  });
}
