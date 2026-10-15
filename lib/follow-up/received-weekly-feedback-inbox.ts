export type ReceivedWeeklyFeedbackHeader = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  request_source: string;
  submitted_at: string | null;
};

export type ReceivedWeeklyFeedbackQuery = {
  cliente?: unknown;
  origem?: unknown;
  mes?: unknown;
  pagina?: unknown;
};

export type ReceivedWeeklyFeedbackFilters = {
  clientId: string | "all";
  origin: "all" | "manual" | "schedule";
  month: string | "all";
  page: number;
  invalid: boolean;
};

export const RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE = 15;

const validMonth = /^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/;
const validPage = /^[1-9][0-9]{0,5}$/;

/**
 * A client in the URL is only accepted if present in the current active
 * assignments. Malformed or out-of-scope filters never silently show all.
 */
export function readReceivedWeeklyFeedbackQuery(
  raw: ReceivedWeeklyFeedbackQuery,
  authorizedClientIds: readonly string[],
): ReceivedWeeklyFeedbackFilters {
  const clientAllowed =
    raw.cliente === undefined ||
    raw.cliente === "all" ||
    (typeof raw.cliente === "string" && authorizedClientIds.includes(raw.cliente));
  const originAllowed = raw.origem === undefined ||
    raw.origem === "all" || raw.origem === "manual" || raw.origem === "schedule";
  const monthAllowed = raw.mes === undefined || raw.mes === "" ||
    raw.mes === "all" || (typeof raw.mes === "string" && validMonth.test(raw.mes));
  const pageAllowed = raw.pagina === undefined ||
    (typeof raw.pagina === "string" && validPage.test(raw.pagina));

  return {
    clientId: clientAllowed && typeof raw.cliente === "string" && raw.cliente !== "all"
      ? raw.cliente : "all",
    origin: raw.origem === "manual" || raw.origem === "schedule" ? raw.origem : "all",
    month: typeof raw.mes === "string" && validMonth.test(raw.mes) ? raw.mes : "all",
    page: pageAllowed && typeof raw.pagina === "string" ? Number(raw.pagina) : 1,
    invalid: !clientAllowed || !originAllowed || !monthAllowed || !pageAllowed,
  };
}

/** Inclusive date bounds for the calendar month of the reference period. */
export function receivedWeeklyFeedbackMonthBounds(month: string): {
  first: string;
  last: string;
} | null {
  if (!validMonth.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(0);
  lastDay.setUTCFullYear(year, monthNumber, 0);
  return {
    first: month + "-01",
    last: month + "-" + String(lastDay.getUTCDate()).padStart(2, "0"),
  };
}

export function exploreReceivedWeeklyFeedbacks<T extends ReceivedWeeklyFeedbackHeader>(
  rows: readonly T[],
  filters: ReceivedWeeklyFeedbackFilters,
  authorizedClientIds: readonly string[],
) {
  const authorized = new Set(authorizedClientIds);
  const matching = filters.invalid ? [] : rows
    .filter((row) =>
      authorized.has(row.client_id) &&
      (filters.clientId === "all" || row.client_id === filters.clientId) &&
      (filters.origin === "all" || row.request_source === filters.origin) &&
      (filters.month === "all" || row.period_start.slice(0, 7) === filters.month) &&
      typeof row.submitted_at === "string" &&
      Number.isFinite(Date.parse(row.submitted_at)))
    .sort((a, b) =>
      Date.parse(b.submitted_at!) - Date.parse(a.submitted_at!) ||
      b.id.localeCompare(a.id));

  const pages = Math.max(1, Math.ceil(matching.length / RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pages);
  const start = (page - 1) * RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE;

  return {
    items: matching.slice(start, start + RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE),
    total: matching.length,
    pages,
    page,
    adjusted: filters.page !== page,
    first: matching.length ? start + 1 : 0,
    last: Math.min(matching.length, start + RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE),
  };
}

export function receivedWeeklyFeedbackInboxHref(
  filters: Pick<ReceivedWeeklyFeedbackFilters, "clientId" | "origin" | "month">,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.clientId !== "all") params.set("cliente", filters.clientId);
  if (filters.origin !== "all") params.set("origem", filters.origin);
  if (filters.month !== "all") params.set("mes", filters.month);
  if (page > 1 && Number.isSafeInteger(page)) params.set("pagina", String(page));
  const query = params.toString();
  return "/admin/feedback-semanal" + (query ? "?" + query : "") + "#recebidos";
}
