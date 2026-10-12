export type ClientFeedbackHistoryQuery = { origem?: unknown; ano?: unknown; mes?: unknown; pagina?: unknown };
export type ClientFeedbackHistoryFilters = {
  origin: "all" | "manual" | "schedule";
  year: string;
  month: string;
  page: number;
  invalid: boolean;
};
export const CLIENT_FEEDBACK_HISTORY_PAGE_SIZE = 10;
const validMonth = /^(0[1-9]|1[0-2])$/;

export function availableClientFeedbackHistoryYears(rows: readonly { period_start: string }[]): string[] {
  return [...new Set(rows.map(row => /^\d{4}-\d{2}-\d{2}$/.test(row.period_start) ? row.period_start.slice(0, 4) : "")
    .filter(Boolean))].sort().reverse();
}
export function formatClientFeedbackHistoryMonth(month: string): string {
  if (!validMonth.test(month)) return "Mês indisponível";
  const date = new Date(Date.UTC(2024, Number(month) - 1, 1, 12));
  return new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(date);
}
export function readClientFeedbackHistoryQuery(
  query: ClientFeedbackHistoryQuery, years: readonly string[],
): ClientFeedbackHistoryFilters {
  const origin = query.origem === "manual" || query.origem === "schedule" ? query.origem : "all";
  const year = typeof query.ano === "string" && years.includes(query.ano) ? query.ano : "all";
  const month = typeof query.mes === "string" && validMonth.test(query.mes) ? query.mes : "all";
  const validPage = typeof query.pagina === "string" && /^[1-9][0-9]{0,5}$/.test(query.pagina);
  const page = validPage ? Number(query.pagina) : 1;
  return {
    origin, year, month, page,
    invalid: (query.origem !== undefined && query.origem !== "all" && query.origem !== origin)
      || (query.ano !== undefined && query.ano !== "all" && query.ano !== year)
      || (query.mes !== undefined && query.mes !== "all" && query.mes !== month)
      || (query.pagina !== undefined && !validPage),
  };
}
export function exploreClientFeedbackHistory<T extends { period_start: string; request_source: string }>(
  rows: readonly T[], filters: ClientFeedbackHistoryFilters,
) {
  const filtered = rows.filter(row =>
    (filters.origin === "all" || row.request_source === filters.origin)
    && (filters.year === "all" || row.period_start.startsWith(filters.year + "-"))
    && (filters.month === "all" || row.period_start.slice(5, 7) === filters.month));
  const pages = Math.max(1, Math.ceil(filtered.length / CLIENT_FEEDBACK_HISTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pages);
  const start = (page - 1) * CLIENT_FEEDBACK_HISTORY_PAGE_SIZE;
  return {
    items: filtered.slice(start, start + CLIENT_FEEDBACK_HISTORY_PAGE_SIZE),
    total: filtered.length, pages, page,
    from: filtered.length ? start + 1 : 0,
    to: Math.min(filtered.length, start + CLIENT_FEEDBACK_HISTORY_PAGE_SIZE),
  };
}
export function clientFeedbackHistoryHref(
  filters: Pick<ClientFeedbackHistoryFilters, "origin" | "year"> & { month?: string },
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.origin !== "all") params.set("origem", filters.origin);
  if (filters.year !== "all") params.set("ano", filters.year);
  if (filters.month && filters.month !== "all" && validMonth.test(filters.month)) params.set("mes", filters.month);
  if (page > 1 && Number.isSafeInteger(page)) params.set("pagina", String(page));
  const query = params.toString();
  return "/cliente/feedback-semanal" + (query ? "?" + query : "") + "#historico-enviado";
}

/** Resolve the exact submitted response through the authorized, unfiltered list. */
export function clientSubmittedFeedbackHref<T extends { id: string }>(
  submitted: readonly T[], targetId: string,
): string | null {
  const index = submitted.findIndex(row => row.id === targetId);
  if (index < 0) return null;
  const page = Math.floor(index / CLIENT_FEEDBACK_HISTORY_PAGE_SIZE) + 1;
  const href = clientFeedbackHistoryHref({ origin: "all", year: "all" }, page);
  return href.replace("#historico-enviado", "#feedback-enviado-" + encodeURIComponent(targetId));
}
