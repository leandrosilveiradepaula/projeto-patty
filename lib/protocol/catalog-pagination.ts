import { PUBLISHED_PROTOCOL_PAGE_SIZE } from "@/lib/protocol/published-read-pagination";

/** Complete an authenticated protocol catalog without inventing parent IDs. */
export async function collectProtocolCatalogPages<T>(
  read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PUBLISHED_PROTOCOL_PAGE_SIZE) {
    const { data, error } = await read(from, from + PUBLISHED_PROTOCOL_PAGE_SIZE - 1);
    if (error) throw error;
    if (data === null) throw new Error("Protocol catalog returned null rows");
    rows.push(...data);
    if (data.length < PUBLISHED_PROTOCOL_PAGE_SIZE) return rows;
  }
}
