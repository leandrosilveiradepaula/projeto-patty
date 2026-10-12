export type ClientNoticeStatus = "all" | "pending" | "responded";
export type ClientNoticeQuery = { situacao?: unknown; ano?: unknown; pagina?: unknown };
export const CLIENT_NOTICE_PAGE_SIZE = 12;
export function availableClientNoticeYears<T extends { feedback?: { period_start: string } }>(
  notices: readonly T[],
): string[] {
  return [...new Set(notices.map(row => {
    const start = row.feedback?.period_start ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(start) ? start.slice(0, 4) : "";
  }).filter(Boolean))].sort().reverse();
}
export function readClientNoticeQuery(
  query: ClientNoticeQuery, years: readonly string[] = [],
): { status: ClientNoticeStatus; year: string; page: number; invalid: boolean } {
  const status: ClientNoticeStatus = query.situacao === "pending" || query.situacao === "responded" ? query.situacao : "all";
  const year = typeof query.ano === "string" && years.includes(query.ano) ? query.ano : "all";
  const pageValid = typeof query.pagina === "string" && /^[1-9][0-9]{0,5}$/.test(query.pagina);
  return {
    status, year, page: pageValid ? Number(query.pagina) : 1,
    invalid: (query.situacao !== undefined && query.situacao !== "all" && query.situacao !== status)
      || (query.ano !== undefined && query.ano !== "all" && query.ano !== year)
      || (query.pagina !== undefined && !pageValid),
  };
}
export function exploreClientNotices<T extends { status: "pending" | "responded"; feedback?: { period_start: string } }>(
  notices: readonly T[], query: { status: ClientNoticeStatus; year?: string; page: number },
) {
  const filtered = notices.filter(n => (query.status === "all" || n.status === query.status)
    && (!query.year || query.year === "all" || n.feedback?.period_start.startsWith(query.year + "-")));
  const pageCount = Math.max(1, Math.ceil(filtered.length / CLIENT_NOTICE_PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, query.page));
  const start = (page - 1) * CLIENT_NOTICE_PAGE_SIZE;
  return {
    items: filtered.slice(start, start + CLIENT_NOTICE_PAGE_SIZE),
    total: filtered.length, page, pageCount,
    first: filtered.length ? start + 1 : 0,
    last: Math.min(filtered.length, start + CLIENT_NOTICE_PAGE_SIZE),
  };
}
export function clientNoticesHref(status: ClientNoticeStatus, page: number, year = "all") {
  const params = new URLSearchParams();
  if (status !== "all") params.set("situacao", status);
  if (year !== "all") params.set("ano", year);
  if (page > 1 && Number.isSafeInteger(page)) params.set("pagina", String(page));
  const query = params.toString();
  return "/cliente/avisos" + (query ? "?" + query : "");
}
