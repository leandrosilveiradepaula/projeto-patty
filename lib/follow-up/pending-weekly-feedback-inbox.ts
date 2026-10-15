import type { ReceivedWeeklyFeedbackFilters } from "./received-weekly-feedback-inbox.ts";
import { RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE } from "./received-weekly-feedback-inbox.ts";

export type WeeklyFeedbackInboxSituation = "recebidos" | "pendentes";

export type PendingWeeklyFeedbackHeader = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  request_source: string;
  submitted_at: string | null;
  created_at: string;
  due_at: string | null;
};

/** Unknown/duplicated status parameters must never broaden the requested scope. */
export function readWeeklyFeedbackInboxSituation(raw: unknown): {
  situation: WeeklyFeedbackInboxSituation;
  invalid: boolean;
} {
  if (raw === undefined || raw === "recebidos") return { situation: "recebidos", invalid: false };
  if (raw === "pendentes") return { situation: "pendentes", invalid: false };
  return { situation: "recebidos", invalid: true };
}

export function weeklyFeedbackOriginLabel(origin: string): string {
  if (origin === "schedule") return "Agendada";
  if (origin === "manual") return "Manual";
  return "Origem não identificada";
}

/** Only non-submitted requests; never expose draft answer values to professionals. */
export function explorePendingWeeklyFeedbacks<T extends PendingWeeklyFeedbackHeader>(
  rows: readonly T[],
  filters: ReceivedWeeklyFeedbackFilters,
  authorizedClientIds: readonly string[],
) {
  const allowed = new Set(authorizedClientIds);
  const matches = filters.invalid ? [] : rows
    .filter(row =>
      allowed.has(row.client_id) &&
      row.submitted_at === null &&
      (filters.clientId === "all" || row.client_id === filters.clientId) &&
      (filters.origin === "all" || row.request_source === filters.origin) &&
      (filters.month === "all" || row.period_start.slice(0, 7) === filters.month))
    .sort((a, b) => b.period_start.localeCompare(a.period_start) ||
      safeInstant(b.created_at) - safeInstant(a.created_at) ||
      b.id.localeCompare(a.id));
  const pages = Math.max(1, Math.ceil(matches.length / RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pages);
  const start = (page - 1) * RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE;
  return {
    items: matches.slice(start, start + RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE),
    total: matches.length,
    pages,
    page,
    adjusted: page !== filters.page,
    first: matches.length ? start + 1 : 0,
    last: Math.min(matches.length, start + RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE),
  };
}

function safeInstant(value: string) {
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : 0;
}

/** Navigation params convey an ID only; the detail page rechecks RLS and exact record. */
export function pendingWeeklyFeedbackExactHref(record: Pick<PendingWeeklyFeedbackHeader, "client_id" | "id">) {
  return "/admin/clientes/" + encodeURIComponent(record.client_id) +
    "/feedback-semanal?registro=" + encodeURIComponent(record.id) +
    "#feedback-pendente-" + encodeURIComponent(record.id);
}

export function weeklyFeedbackPendingInboxHref(
  filters: Pick<ReceivedWeeklyFeedbackFilters, "clientId" | "origin" | "month">,
  page: number,
) {
  const params = new URLSearchParams({ situacao: "pendentes" });
  if (filters.clientId !== "all") params.set("cliente", filters.clientId);
  if (filters.origin !== "all") params.set("origem", filters.origin);
  if (filters.month !== "all") params.set("mes", filters.month);
  if (Number.isSafeInteger(page) && page > 1) params.set("pagina", String(page));
  return "/admin/feedback-semanal?" + params.toString() + "#aguardando-cliente";
}
