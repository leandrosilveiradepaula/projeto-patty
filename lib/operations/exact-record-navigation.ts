/** Resolve navigation ONLY within the already RLS-authorized list, never by querying an untrusted ID. */
export function authorizedExactRecordPage<T extends { id: string }>(
  rows: readonly T[],
  rawId: unknown,
  pageSize: number,
): number | null {
  if (typeof rawId !== "string" || rawId.length === 0 || rawId.length > 128
    || !Number.isSafeInteger(pageSize) || pageSize < 1) return null;
  const index = rows.findIndex((row) => row.id === rawId);
  return index < 0 ? null : Math.floor(index / pageSize) + 1;
}

export function exactRecordHref(base: string, param: string, id: string, anchor: string): string {
  const query = new URLSearchParams({ [param]: id }).toString();
  return base + "?" + query + "#" + anchor + encodeURIComponent(id);
}
